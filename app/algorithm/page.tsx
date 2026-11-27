"use client";
// The algorithm as layers. Every box is a real step in lib/engine.ts or lib/pipeline.ts; with an answer in this browser,
// each step lights up with what it actually did for that answer.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useChat } from "@/lib/chat";
import type { Reply, TraceStep } from "@/lib/engine";
import { REGISTRY, label } from "@/lib/params";
import { VERSIONS } from "@/lib/versions";

interface Layer { n: number; name: string; role: string; steps: [string, string][]; }
const LAYERS: Layer[] = [
  { n: 1, name: "Input and safety", role: "Reads the message and stops for anything that needs a person, before any adaptation happens.", steps: [["RECEIVE", "Receive the message and profile"], ["SAFETY_SCAN", "Crisis language scan"], ["ADVICE_CHECK", "Personal medical question check"], ["ESCALATE", "Route to trusted adults if needed"]] },
  { n: 2, name: "Understanding the reader", role: "Turns what the reader said into signals: requests, stated preferences and stated feelings. Nothing is inferred that was not said.", steps: [["DETECT_SIGNALS", "Requests: simpler, more detail, confused, understood"], ["DETECT_STATEMENTS", "Lasting preferences in their own words"], ["READ_EMOTION", "Stated feelings only"]] },
  { n: 3, name: "Memory and policy", role: "Applies the adaptation policy: one request changes this chat, a repeated one becomes a saved preference. Every change is an event with a reason.", steps: [["UPDATE_MEMORY", "Update memory records and adaptation events"], ["SELECT_CONFIG", "Compute the 12 adaptation parameters"], ["REVISION_CHECK", "Change approach after repeated confusion or a missed check"]] },
  { n: 4, name: "Adaptation", role: "Fuses developmental, linguistic and psychological rules with the evidence matrix row for this age and topic into one writing plan.", steps: [["SELECT_STRATEGY", "Developmental and linguistic plan"], ["GUIDELINES", "Evidence matrix row for this age × topic"], ["COMPREHENSION_CHECK", "Decide on a quick check"]] },
  { n: 5, name: "Knowledge", role: "Finds what the answer is allowed to say: approved content and passages from link-checked sources.", steps: [["TOPIC_MATCH", "Match the medical topic"], ["RETRIEVE", "Retrieve approved content and verified sources"]] },
  { n: 6, name: "Generation", role: "The language model writes under the plan's constraints. It is regenerated once if the reading level, length or wording is off.", steps: [["GENERATE", "Write the answer, citing sources per sentence"]] },
  { n: 7, name: "Verification", role: "Checks the output against the sources, the guidelines and the safety rules before the reader relies on it.", steps: [["CITATION_CHECK", "Match each citation to its source passage"], ["WORDING_CHECK", "Words the guidelines say to avoid"], ["OUTPUT_GUARD", "Dosing, prognosis, diagnosis language"], ["REASSURANCE_CHECK", "False promises"], ["VALIDATE", "Reading grade and length"]] },
  { n: 8, name: "Learning and record", role: "Matches support resources, then records the message report so the next answer and the research can learn from this one.", steps: [["RESOURCE_MATCH", "Verified community resources"], ["LOG", "Message report, events, versions"]] },
];
const STATUS: Record<TraceStep["status"], string> = { ok: "ran", adapted: "adapted", triggered: "fired", skipped: "skipped" };

export default function Algorithm() {
  const { convos } = useChat();
  const answers = useMemo(() => convos.flatMap(c => c.msgs.filter(m => m.reply?.trace?.length).map(m => ({ id: m.id, reply: m.reply as Reply, q: c.msgs[c.msgs.indexOf(m) - 1]?.text ?? "" }))).reverse(), [convos]);
  const [pick, setPick] = useState(0); const cur = answers[pick]; const tr = cur?.reply.trace ?? [];
  const step = (name: string) => tr.find(s => s.name === name);
  const [open, setOpen] = useState<string | null>(null);
  return (<>
    <div className="eyebrow">Research · Algorithm</div><h1>Inside the adaptive engine</h1>
    <p>Eight layers turn one message into one answer. The language model is a single step in layer 6. Everything before it decides how to explain, and everything after it checks the result. Each box below is a step that really runs{cur ? "; the highlighted ones show what happened for the answer you pick" : ""}.</p>

    {answers.length > 0 ? <div className="al-pick"><label htmlFor="ans">Show the path of</label><select id="ans" value={pick} onChange={e => setPick(+e.target.value)}>{answers.slice(0, 30).map((a, i) => <option key={a.id} value={i}>{a.q ? `“${a.q.slice(0, 70)}”` : `Answer ${a.id}`}</option>)}</select>
      <span className="muted">{tr.length} steps · {tr.filter(s => s.status === "adapted").length} adapted · {tr.filter(s => s.status === "triggered").length} fired</span></div>
      : <div className="callout">Ask a question in <Link href="/chat">Chat</Link> to see each layer light up with what it did.</div>}

    <ol className="al">{LAYERS.map(L => { const hits = L.steps.map(([k]) => step(k)).filter(Boolean) as TraceStep[]; const hot = hits.some(s => s.status === "adapted" || s.status === "triggered");
      return <li key={L.n} className={"al-layer" + (hot ? " hot" : hits.length ? " ran" : "")}>
        <div className="al-head"><span className="al-n">L{L.n}</span><div><h2>{L.name}</h2><p>{L.role}</p></div></div>
        <div className="al-steps">{L.steps.map(([k, d]) => { const s = step(k); const isOpen = open === `${L.n}:${k}`;
          return <button key={k} className={"al-step " + (s ? s.status : "idle") + (isOpen ? " open" : "")} onClick={() => setOpen(isOpen ? null : `${L.n}:${k}`)} aria-expanded={isOpen}>
            <span className="al-k"><code>{k}</code>{s && <em>{STATUS[s.status]}</em>}</span><span className="al-d">{d}</span>
            {isOpen && s && <span className="al-r"><b>{s.call}</b>{s.result}</span>}{isOpen && !s && <span className="al-r">{cur ? "Did not run for this answer (for example, a template answer or a safety stop)." : "Pick an answer to see its result."}</span>}</button>; })}</div>
      </li>; })}</ol>

    {cur?.reply.config && <section className="rsec"><h2>The plan layer 4 produced</h2><p className="sub">The 12 adaptation parameters for this answer. Highlighted ones differ from the reader&apos;s starting profile.</p>
      <div className="al-params">{REGISTRY.map(p => { const v = cur.reply.config![p.id]; const b = cur.reply.configBefore?.[p.id]; return <div key={p.id} className={b != null && b !== v ? "chg" : ""}><span>{p.label}</span><b>{label(p.id, v)}</b><i>{p.values.map((_, j) => <u key={j} className={j === v ? "on" : ""} />)}</i></div>; })}</div></section>}

    <p className="muted">System <code>{VERSIONS.system}</code> · <Link href="/method">Method</Link> · <Link href="/guidelines">Guideline matrix</Link> · <Link href="/literature">Evidence</Link></p>
  </>);
}
