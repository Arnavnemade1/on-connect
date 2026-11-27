"use client";
// Pieces shown under each answer: where the information comes from, what adapted (with undo), and a quick teach-back check.
import { useState } from "react";
import { ArrowUpRight, Check, RotateCcw, X } from "lucide-react";
import type { Reply } from "@/lib/engine";
import type { CheckResult } from "@/lib/store";
import { SOURCE_BY_ID, TYPE_LABEL } from "@/lib/sources";
import { eventLabel, type AdaptEvent } from "@/lib/memory";

/** “Where this information comes from” (spec 21.7). Model answers list the sources they cite, numbered as in the text. Template answers list the topic's sources and say they were not matched claim by claim. */
export function Citations({ reply }: { reply: Reply }) {
  const ids = reply.sources ?? []; if (!ids.length) return reply.topicId || reply.safety ? null : <div className="cites none">No verified source matched this question, so treat it as general explanation and check specifics with your care team.</div>;
  const perClaim = reply.citations?.coverage != null; const cited = new Set(reply.citations?.cited ?? []);
  const list = ids.map((id, i) => ({ n: i + 1, s: SOURCE_BY_ID[id] })).filter(x => x.s && (!perClaim || cited.has(x.s.id)));
  if (!list.length) return null;
  return (<details className="cites"><summary>Where this information comes from <span className="muted">{list.length} {list.length === 1 ? "source" : "sources"}</span></summary>
    <ol>{list.map(({ n, s }) => <li key={s.id} value={perClaim ? n : undefined}><a href={s.url} target="_blank" rel="noreferrer">{s.title}<ArrowUpRight size={12} /></a><span>{s.org}</span><span className="muted">{TYPE_LABEL[s.type]}{s.reviewed ? ` · reviewed ${s.reviewed}` : ""} · link checked {s.verified}</span></li>)}</ol>
    {!perClaim && <p className="muted">This answer came from Onconnect&apos;s draft content. These sources cover the topic but were not matched to each sentence.</p>}
    {perClaim && reply.citations!.weak > 0 && <p className="muted">{reply.citations!.weak} citation{reply.citations!.weak === 1 ? "" : "s"} matched the source only weakly. Check the original if it matters.</p>}
  </details>);
}

/** What changed for this answer, each change with an undo (spec 7.5, 15.1). */
export function AdaptLine({ events, statusOf, onUndo }: { events: AdaptEvent[]; statusOf: (id: string) => AdaptEvent["status"] | undefined; onUndo: (id: string) => void }) {
  const shown = events.filter(e => e.trigger !== "reversal"); if (!shown.length) return null;
  return (<div className="adaptline" aria-label="What adapted for this answer">{shown.map(e => { const st = statusOf(e.id) ?? e.status;
    return <span key={e.id} className={"achip" + (st !== "applied" ? " off" : "")} title={`${e.id} · ${e.rule} · ${e.scope === "session" ? "this conversation only" : "saved preference"}`}>
      {eventLabel(e)}<em>{e.scope === "session" ? "this chat" : "saved"}</em>{st === "applied" ? <button onClick={() => onUndo(e.id)} aria-label={`Undo ${eventLabel(e)}`}><RotateCcw size={12} /></button> : <em>{st}</em>}</span>; })}</div>);
}

/** Teach-back: one optional question from the topic's quiz bank. The result is recorded and shapes the next explanation. */
export function TeachBack({ reply, done, onAnswer }: { reply: Reply; done?: CheckResult; onAnswer: (choice: number) => void }) {
  const tb = reply.teachback; const [skip, setSkip] = useState(false); if (!tb || skip) return null;
  if (done) return <div className={"tb done " + (done.correct ? "ok" : "miss")}>{done.correct ? <Check size={15} /> : <X size={15} />}{done.correct ? "Nice, that's right." : `Not quite. The answer is “${tb.q.options[tb.q.answer]}”. I'll explain it a different way next time.`}</div>;
  return (<div className="tb" role="group" aria-label="Quick check"><div className="tbh"><b>Quick check</b><span className="muted">Optional. It helps me explain things better.</span><button className="tbx" onClick={() => setSkip(true)} aria-label="Skip the quick check"><X size={14} /></button></div>
    <p>{tb.q.q}</p><div className="tbo">{tb.q.options.map((o, i) => <button key={o} onClick={() => onAnswer(i)}>{o}</button>)}</div></div>);
}
