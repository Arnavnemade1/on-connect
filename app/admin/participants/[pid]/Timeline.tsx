"use client";
// Visual adaptation timeline (spec 22.1). Filter, open an event, compare the configuration before and after,
// see the memory entries and message involved, the outcome that followed, and export the history.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { PARAM, REGISTRY, label, type ParamId } from "@/lib/params";
import type { EvRow, RecRow } from "@/lib/adminMetrics";

export interface TEvent extends EvRow { outcome: string; before: Record<string, number> | null; after: Record<string, number> | null; }
export default function Timeline({ pid, events, records, convTitles }: { pid: string; events: TEvent[]; records: RecRow[]; convTitles: Record<string, string> }) {
  const [comp, setComp] = useState(""); const [conv, setConv] = useState(""); const [param, setParam] = useState<ParamId>("reading_level"); const [open, setOpen] = useState<string | null>(null);
  const comps = [...new Set(events.map(e => e.component ?? ""))].filter(Boolean); const convs = [...new Set(events.map(e => e.conversation_id ?? ""))].filter(Boolean);
  const shown = events.filter(e => (!comp || e.component === comp) && (!conv || e.conversation_id === conv));
  const series = useMemo(() => events.filter(e => e.parameter === param && e.trigger !== "reversal").map(e => ({ ts: e.ts, v: e.next, scope: e.scope, id: e.id })), [events, param]);
  const ev = events.find(e => e.id === open);
  const W = 720, H = 150, L = 96, R = 16, T = 12, B = 26; const max = PARAM[param].values.length - 1;
  const x = (i: number) => (series.length < 2 ? (L + W - R) / 2 : L + (i / (series.length - 1)) * (W - L - R)); const y = (v: number) => T + (1 - v / Math.max(1, max)) * (H - T - B);
  const exportJson = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ participant: pid, exported: new Date().toISOString(), events: shown }, null, 2)], { type: "application/json" })); a.download = `adaptation-history-${pid}.json`; a.click(); fetch(`/api/admin/log?action=export_timeline&target=${pid}`).catch(() => {}); };
  return (<div className="tlw">
    <div className="tlctl"><label>Parameter<select value={param} onChange={e => setParam(e.target.value as ParamId)}>{REGISTRY.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <label>Component<select value={comp} onChange={e => setComp(e.target.value)}><option value="">All</option>{comps.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Session<select value={conv} onChange={e => setConv(e.target.value)}><option value="">All</option>{convs.map(c => <option key={c} value={c}>{convTitles[c] ?? c}</option>)}</select></label>
      <span className="grow" /><button className="btn alt sm" onClick={exportJson}><Download size={14} />Export history</button></div>
    <figure className="rfig"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${PARAM[param].label} over time for ${pid}`}>
      {PARAM[param].values.map((v, i) => <g key={v}><line x1={L} x2={W - R} y1={y(i)} y2={y(i)} className="gl" /><text x={L - 8} y={y(i) + 4} textAnchor="end" className="ax">{v}</text></g>)}
      {series.length > 1 && <polyline points={series.map((s, i) => `${x(i)},${y(s.v)}`).join(" ")} className="meas" />}
      {series.map((s, i) => <g key={s.id} onClick={() => setOpen(s.id)} style={{ cursor: "pointer" }}>{s.scope === "persistent" ? <rect x={x(i) - 5} y={y(s.v) - 5} width="10" height="10" className="dot" /> : <circle cx={x(i)} cy={y(s.v)} r="5" className="dot" />}</g>)}
    </svg><figcaption><span className="k"><i className="sw dot" />Change for one conversation</span><span className="k"><i className="sw sq2" />Saved preference</span><span className="k">Click a point to open the event</span></figcaption></figure>
    {series.length === 0 && <p className="muted">No changes to {PARAM[param].label.toLowerCase()} yet.</p>}
    <div className="tlgrid"><ol className="tll">{shown.map(e => <li key={e.id} className={(open === e.id ? "on " : "") + e.status}><button onClick={() => setOpen(e.id)}>
      <span className="muted">{new Date(e.ts).toLocaleString()}</span><b>{PARAM[e.parameter as ParamId]?.label ?? e.parameter}: {label(e.parameter as ParamId, e.prev)} → {label(e.parameter as ParamId, e.next)}</b>
      <span className="muted">{e.trigger.replaceAll("_", " ")} · {e.scope === "session" ? "this conversation" : "saved preference"} · {e.status}</span></button></li>)}</ol>
      <div className="tld">{!ev ? <p className="muted">Select an event to see its full record.</p> : <>
        <h3><code>{ev.id}</code></h3>
        <table><tbody><tr><td className="muted">When</td><td>{new Date(ev.ts).toLocaleString()}</td></tr><tr><td className="muted">Session</td><td>{convTitles[ev.conversation_id ?? ""] ?? ev.conversation_id}</td></tr><tr><td className="muted">Component</td><td>{ev.component}</td></tr>
          <tr><td className="muted">Trigger</td><td>{ev.trigger.replaceAll("_", " ")}</td></tr><tr><td className="muted">Evidence</td><td>“{ev.evidence}”</td></tr><tr><td className="muted">Rule</td><td>{ev.rule}</td></tr>
          <tr><td className="muted">Scope</td><td>{ev.scope === "session" ? "Temporary: this conversation" : "Persistent preference"}</td></tr><tr><td className="muted">Confidence</td><td>{ev.trigger === "explicit_preference" ? "High (stated directly)" : ev.trigger === "repeated_pattern" ? "Medium (pattern, unconfirmed)" : ev.trigger === "comprehension_check" ? "Medium (one check)" : "Request in this message"}</td></tr>
          <tr><td className="muted">Status</td><td>{ev.status}{ev.reverses ? ` (reverses ${ev.reverses})` : ""}</td></tr><tr><td className="muted">What followed</td><td>{ev.outcome}</td></tr></tbody></table>
        {ev.before && ev.after && <><h4>Configuration before and after</h4><table><thead><tr><th>Parameter</th><th>Before</th><th>After</th></tr></thead><tbody>{REGISTRY.filter(p => ev.before![p.id] !== ev.after![p.id] || p.id === ev.parameter).map(p => <tr key={p.id} className="chg"><td>{p.label}</td><td>{label(p.id, ev.before![p.id])}</td><td>{label(p.id, ev.after![p.id])}</td></tr>)}</tbody></table></>}
        <h4>Memory entries from this session</h4>{(() => { const rs = records.filter(r => r.sessions.includes(ev.conversation_id ?? "")); return rs.length ? <ul className="plain">{rs.map(r => <li key={r.id}><code>{r.id}</code> {r.content} <span className="muted">({r.status})</span></li>)}</ul> : <p className="muted">None.</p>; })()}
        {ev.message_id && <p><Link href={`/admin/messages/${pid}/${ev.message_id}`}>Open the message report</Link></p>}
        <p className="muted">“What followed” describes the next turn in the same conversation. It is not evidence that the change caused it.</p></>}</div></div>
  </div>);
}
