import Link from "next/link";
import { notFound } from "next/navigation";
import { gate, loadResearch, logAccess, participant } from "@/lib/admin";
import { beforeAfter, type MsgRow } from "@/lib/adminMetrics";
import { CARE_STAGES } from "@/lib/engine";
import Timeline, { type TEvent } from "./Timeline";

export const dynamic = "force-dynamic";
const PROBLEM = /simpl|easier|don'?t (get|understand)|confus|more detail|shorter|longer/i;

/** Level 2 longitudinal report for one participant (spec 10.2, 14.2, 21.3 item 1, 22.1, 22.2). */
export default async function ParticipantPage({ params }: { params: Promise<{ pid: string }> }) {
  const g = await gate(); if (!g.ok) return null; const { pid } = await params;
  const p = await participant(g.ctx, pid); if (!p) notFound(); await logAccess(g.ctx, "view_participant", pid);
  const d = await loadResearch(g.ctx, {}, p.user_id);
  const byId = new Map(d.msgs.map(m => [m.id, m])); const titles = Object.fromEntries(d.conversations.map(c => [c.id, c.title || "Untitled"]));
  const nextUser = (m: MsgRow | undefined) => m ? d.msgs.find(x => x.conversation_id === m.conversation_id && x.role === "user" && x.created_at > m.created_at) : undefined;
  const events: TEvent[] = d.events.map(e => { const msg = e.message_id ? byId.get(e.message_id) : undefined; const nu = nextUser(msg); const ck = d.checks.find(c => c.conversation_id === e.conversation_id && c.ts > e.ts);
    const outcome = e.status === "reversed" ? "Reversed by the participant" : ck ? `Next comprehension check ${ck.correct ? "correct" : "missed"}` : nu ? (PROBLEM.test(nu.content) ? `Next message asked again: “${nu.content.slice(0, 60)}”` : "Next message did not ask for another change") : "Awaiting further evaluation";
    return { ...e, outcome, before: msg?.report?.configBefore ?? null, after: msg?.report?.config ?? null }; });
  const ba = beforeAfter(d.msgs, d.checks); const recs = [...d.records].sort((a, b) => b.created.localeCompare(a.created));
  const topics = [...new Set(d.msgs.filter(m => m.report?.topic).map(m => m.report!.topic as string))];
  const unresolved = d.records.filter(r => r.key.startsWith("edu:clarify:") && r.status === "active");
  return (<>
    <div className="admhead"><div><div className="eyebrow"><Link href="/admin/participants">Participants</Link></div><h1><code>{p.pseudonym}</code></h1>
      <p className="muted">{p.user_type} · ages {p.age_band ?? "–"} · {CARE_STAGES.find(s => s[0] === p.care_stage)?.[1] ?? "care stage not given"} · consented {p.consent_at ? new Date(p.consent_at).toLocaleDateString() : "–"} · {d.conversations.length} sessions · {d.msgs.filter(m => m.role === "assistant").length} AI messages</p></div></div>

    <section className="admsec"><h2>Adaptation timeline</h2><p className="muted">Every change to this participant&apos;s communication settings, in order.</p>
      <Timeline pid={p.pseudonym} events={events} records={d.records} convTitles={titles} /></section>

    <section className="admsec two"><div><h2>Earlier versus later</h2><p className="muted">Spec 10.3. Compares the first and second half of this participant&apos;s answers. It shows change alongside personalization updates; it does not show that the updates caused it.</p>
      {ba ? <table><thead><tr><th></th><th>Earlier ({ba.early.n})</th><th>Later ({ba.later.n})</th></tr></thead><tbody>
        <tr><td>Average words</td><td>{f(ba.early.words)}</td><td>{f(ba.later.words)}</td></tr><tr><td>Reading grade</td><td>{f(ba.early.grade)}</td><td>{f(ba.later.grade)}</td></tr><tr><td>Glossary terms per answer</td><td>{f(ba.early.terms)}</td><td>{f(ba.later.terms)}</td></tr>
        <tr><td>Teach-back offered</td><td>{Math.round(ba.early.teachback * 100)}%</td><td>{Math.round(ba.later.teachback * 100)}%</td></tr><tr><td>Clarification requests</td><td>{ba.early.simpler}</td><td>{ba.later.simpler}</td></tr><tr><td>Checks correct</td><td>{ba.early.correct}/{ba.early.checks}</td><td>{ba.later.correct}/{ba.later.checks}</td></tr></tbody></table>
        : <p className="muted">Needs at least four AI messages.</p>}
      <h2 style={{ marginTop: 32 }}>Learning</h2><p>Topics explained: {topics.join(", ") || "none"}.</p><p>Comprehension checks: {d.checks.filter(c => c.correct).length} of {d.checks.length} correct (immediate only).</p>
      <p>Still needing clarification: {unresolved.map(r => r.content.split(":")[0]).join(", ") || "none recorded"}.</p></div>
      <div><h2>Memory history</h2><p className="muted">Spec 22.2. What was added, changed, corrected, expired or removed. Content of deleted records is removed; the audit entry stays.</p>
        <ol className="memhist">{recs.map(r => <li key={r.id} className={r.status}><div><code>{r.id}</code> <b>{r.content}</b></div><div className="muted">{r.kind.replaceAll("_", " ")} · {r.source.replaceAll("_", " ")} · {r.confidence} confidence · {r.status}</div>
          <ul>{r.history.map((h, i) => <li key={i}><span className="muted">{new Date(h.ts).toLocaleString()}</span> {h.action.replaceAll("_", " ")}{h.prev && h.next ? `: “${h.prev}” → “${h.next}”` : ""} · {h.reason} <span className="muted">({h.by})</span></li>)}</ul></li>)}</ol>
        {!recs.length && <p className="muted">No memory records.</p>}</div></section>

    <section className="admsec"><h2>Sessions and transcripts</h2><p className="muted">Authorized by this participant&apos;s research consent. Open any AI message for its full report.</p>
      {d.conversations.map(c => { const ms = d.msgs.filter(m => m.conversation_id === c.id); return <details key={c.id} className="trans"><summary><b>{c.title || "Untitled"}</b> <span className="muted">{new Date(c.created_at).toLocaleString()} · {ms.length} messages</span></summary>
        <ol>{ms.map(m => <li key={m.id} className={m.role}><span className="who">{m.role === "user" ? "Participant" : "Onconnect"}</span><p>{m.content.slice(0, 600)}{m.content.length > 600 ? "…" : ""}</p>{m.role === "assistant" && <Link href={`/admin/messages/${p.pseudonym}/${m.id}`}>Message report</Link>}</li>)}</ol></details>; })}</section>
  </>);
}
const f = (x: number | null) => (x == null ? "–" : String(Math.round(x * 10) / 10));
