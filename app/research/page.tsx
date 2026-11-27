"use client";
import { eventLabel } from "@/lib/memory";
import Link from "next/link";
import { useLog, useMemory, useRatings, useStudy } from "@/lib/store";
import { mean } from "@/lib/stats";
const Bars = ({ data }: { data: [string, number][] }) => { const m = Math.max(1, ...data.map(d => d[1])); return <div>{data.map(([k, v]) => <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", margin: "5px 0" }}><span className="muted" style={{ width: 210, flex: "none", fontSize: "var(--t1)", fontFamily: "ui-monospace,monospace" }}>{k}</span><div className="bar" style={{ flex: 1 }}><i style={{ width: `${(v / m) * 100}%` }} /></div><b style={{ width: 28, textAlign: "right" }}>{v}</b></div>)}</div>; };
const count = (a: string[]) => Object.entries(a.reduce<Record<string, number>>((o, k) => (o[k] = (o[k] ?? 0) + 1, o), {})).sort((x, y) => y[1] - x[1]) as [string, number][];
export default function Research() {
  const [log, , r1] = useLog(); const [mem, , r2] = useMemory(); const [study, , r3] = useStudy(); const [ratings, , r4] = useRatings();
  if (!(r1 && r2 && r3 && r4)) return null;
  const g = log.filter(e => e.grade != null); const tg = log.filter(e => e.grade != null && e.targetGrade != null);
  const mae = tg.length ? mean(tg.map(e => Math.abs(e.grade! - e.targetGrade!))) : NaN;
  const byAge = ["6-8", "9-11", "12-14", "15-17"].map(a => [`ages ${a}`, +(mean(g.filter(e => e.age === a).map(e => e.grade!)) || 0).toFixed(1)] as [string, number]);
  const sig = count(log.flatMap(e => e.signals ?? [])); const ad = count(log.flatMap(e => e.adaptations)); const fb = count(log.map(e => e.feedback ?? "none").filter(x => x !== "none")); const models = count(log.map(e => e.model));
  const n = (v: number, d = 1) => Number.isFinite(v) ? v.toFixed(d) : "–";
  return (<><div className="eyebrow">Research dashboard</div><h1>What the data says so far</h1>
    <p className="muted" style={{ maxWidth: 680 }}>Aggregates from the audit log, chat memory, comprehension study and clinician reviews. Everything is local to this browser.</p>
    <div className="kpi"><div><b>{log.length}</b><span>Logged replies</span></div><div><b>{n(mean(g.map(e => e.grade!)))}</b><span>Mean reading grade</span></div><div><b>{n(mae)}</b><span>Mean grade error vs target</span></div><div><b>{sig.reduce((a, b) => a + b[1], 0)}</b><span>Signals detected</span></div><div><b>{study.length}</b><span>Study responses</span></div><div><b>{ratings.length}</b><span>Clinician reviews</span></div></div>
    <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="card"><h2>Reading grade by age profile</h2><Bars data={byAge} /><p className="muted">If adaptation works, grades should rise with age band.</p></div>
      <div className="card"><h2>Adaptation operations</h2>{ad.length ? <Bars data={ad.slice(0, 8)} /> : <p className="muted">No data yet.</p>}</div>
      <div className="card"><h2>User signals</h2>{sig.length ? <Bars data={sig} /> : <p className="muted">No signals yet. Try saying “simpler” or “I don&apos;t understand” in chat.</p>}</div>
      <div className="card"><h2>Feedback and models</h2>{fb.length ? <Bars data={fb} /> : <p className="muted">No feedback yet.</p>}<h3 style={{ marginTop: 14 }}>Answer source</h3><Bars data={models.length ? models : [["none", 0]]} /></div></div>
    <div className="card"><h2>Recent adaptation events</h2><p className="muted">Every parameter change, with its rule and scope ({mem.events.length} recorded on this device). <Link href="/report">Session report</Link></p>{mem.events.length ? <div className="wrap"><table><thead><tr><th>Event</th><th>Change</th><th>Scope</th><th>Trigger</th><th>Status</th></tr></thead><tbody>{[...mem.events].reverse().slice(0, 12).map(e => <tr key={e.id}><td><code>{e.id}</code></td><td>{eventLabel(e)}</td><td>{e.scope}</td><td>{e.trigger.replaceAll("_", " ")}</td><td>{e.status}</td></tr>)}</tbody></table></div> : <p className="muted">No events yet.</p>}</div>
    <div className="card"><h2>Hypotheses</h2><ol><li><b>H1</b> Adapted explanations produce higher comprehension than generic ones. <Link href="/study">Run the study</Link></li><li><b>H2</b> Reading grade of replies tracks the target for each age profile (grade error stays small).</li><li><b>H3</b> After “confusing” signals, later replies for that topic are simpler and use more scaffolding.</li><li><b>H4</b> Clinician-rated accuracy of AI explanations is high and safety rules catch personal advice requests. <Link href="/clinician">Review content</Link></li></ol></div></>);
}
