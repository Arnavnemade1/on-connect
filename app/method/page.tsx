import Link from "next/link";
import { LEVELS, PROFILES } from "@/lib/content";
import { BASE_GRADE, capFor } from "@/lib/engine";
import { REGISTRY } from "@/lib/params";
import { POLICY_TABLE } from "@/lib/memory";
import { VERSIONS, VERSION_LABEL, type Versions } from "@/lib/versions";
import { SOURCES } from "@/lib/sources";

const COMPONENTS: [string, string][] = [
  ["Patient Context Manager", "Profile, stated preferences and user-provided medical context, each with its source and confidence."],
  ["Developmental Adaptation Engine", "Five profiles set reading level, concept density, pacing and visual support."],
  ["Linguistic Adaptation Engine", "Terminology, definitions, analogies, structure and length."],
  ["Psychological Communication Engine", "Responds to stated feelings only: acknowledges, avoids promises, suggests trusted adults, respects “not now”."],
  ["Medical Context Engine", "Matches the topic, carries follow-ups, flags personal medical questions."],
  ["Educational Knowledge Retrieval Engine", `Approved draft content plus ${SOURCES.length} link-checked sources with stored passages.`],
  ["Comprehension and Learning Engine", "Detects confusion and understanding; offers teach-back checks."],
  ["Memory Management Engine", "Typed records with source, confidence, status, expiry and full history; corrections never overwrite silently."],
  ["Response Revision Engine", "Changes approach after repeated confusion or a missed check, without changing medical facts."],
  ["Medical Safety and Verification Engine", "Crisis escalation, individual-advice redirect, output guard, citation check, reading-level validator."],
  ["Research Instrumentation Engine", "Message, session and longitudinal reports; adaptation events; versions on every message."],
];
const FLOW = ["Read the message and the reader's profile", "Safety scan for crisis language", "Read stated emotions, signals and lasting statements", "Update memory and adaptation parameters (each change is an event with a reason)", "Match the medical topic and check for personal medical questions", "Decide whether to revise the approach", "Plan the answer from the parameters", "Retrieve approved content and verified sources", "Generate with the configured model, citing sources per sentence", "Check citations against the stored passages; guard against advice and false reassurance", "Validate reading level and length; regenerate once if far off", "Match verified community resources if a support need was stated", "Record the message report, events and memory changes"];

export default function Method() {
  return (<>
    <div className="eyebrow">Research · Method</div><h1>How Onconnect decides how to explain</h1>
    <p>One central engine coordinates eleven components. The language model only writes the words. Who it writes for, how much, in what order and with which sources is decided before it is called, and checked after.</p>
    <div className="card"><h2>Components</h2><div className="wrap"><table><tbody>{COMPONENTS.map(([c, d]) => <tr key={c}><td><b>{c}</b></td><td className="muted">{d}</td></tr>)}</tbody></table></div></div>
    <div className="card"><h2>What happens to every message</h2><ol className="plain">{FLOW.map(s => <li key={s}>{s}</li>)}</ol><p className="muted">Each step appears, with its real inputs and results, in the Algorithm tab of the research panel and in the session report.</p></div>
    <div className="card"><h2>Five developmental profiles</h2><div className="wrap"><table><thead><tr><th>Profile</th><th>Target reading grade</th><th>Word cap (short / medium / long)</th></tr></thead><tbody>{LEVELS.map((l, i) => <tr key={l}><td>Ages {l} · {PROFILES[l]}</td><td>{BASE_GRADE[i]}</td><td>{capFor(i, 0)} / {capFor(i, 1)} / {capFor(i, 2)}</td></tr>)}</tbody></table></div>
      <p className="muted">Targets use the Flesch–Kincaid grade, which is a coarse proxy for text difficulty and is not meaningful for read-aloud at ages 3–5. They are engineering starting points to be calibrated by research. Age is never treated as a measure of what a child understands.</p></div>
    <div className="card"><h2>Adaptation parameters</h2><div className="wrap"><table><thead><tr><th>Parameter</th><th>Levels</th><th>What it controls</th></tr></thead><tbody>{REGISTRY.map(p => <tr key={p.id}><td><b>{p.label}</b></td><td className="muted">{p.values.join(" · ")}</td><td className="muted">{p.describe}</td></tr>)}</tbody></table></div>
      <p className="muted">Named engineering settings, not validated scales.</p></div>
    <div className="card"><h2>Adaptation policy</h2><p>Every change records its parameter, previous and new value, trigger, the reader&apos;s words, the rule, the component, and whether it lasts. One request changes only the current conversation; a repeated request or a direct statement becomes a saved preference; every change can be undone.</p>
      <div className="wrap"><table><thead><tr><th>Rule</th><th>When</th><th>What changes</th><th>Scope</th></tr></thead><tbody>{POLICY_TABLE.map(r => <tr key={r.id}><td><code>{r.id}</code></td><td>{r.when}</td><td className="muted">{r.does}</td><td>{r.scope}</td></tr>)}</tbody></table></div></div>
    <div className="card"><h2>What it never does</h2><ul className="plain"><li>Diagnose, give doses, or discuss an individual prognosis.</li><li>Infer or store a psychological condition; feelings are session-only and never labelled.</li><li>Treat medical details a reader mentions as verified.</li><li>Cite a source that is not in the verified registry, or show a citation number that points nowhere.</li><li>Change shared rules, safety policy or medical content from one patient&apos;s conversation.</li></ul></div>
    <div className="card"><h2>Versions</h2><div className="wrap"><table><tbody>{(Object.keys(VERSIONS) as (keyof Versions)[]).map(k => <tr key={k}><td className="muted">{VERSION_LABEL[k]}</td><td><code>{VERSIONS[k]}</code></td></tr>)}</tbody></table></div>
      <p className="muted"><Link href="/literature">Evidence behind each rule</Link> · <Link href="/eval">Evaluation harness</Link> · <Link href="/report">Session report</Link></p></div>
  </>);
}
