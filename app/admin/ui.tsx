// Server-safe building blocks for the admin dashboards.
import type { Metric } from "@/lib/adminMetrics";
export function MetricCard({ m }: { m: Metric }) {
  return (<div className="mcard"><div className="mlabel">{m.label}</div><div className="mval">{m.value}</div>
    <div className="mden">{m.den != null ? `n = ${m.num ?? "–"} of ${m.den}` : m.num != null ? `n = ${m.num}` : ""}{m.missing ? ` · ${m.missing} missing` : ""}{m.ci ? ` · 95% CI ${Math.round(m.ci[0] * 100)}–${Math.round(m.ci[1] * 100)}%` : ""}</div>
    <details className="mdef"><summary>Definition</summary><p>{m.definition}</p><p className="muted">Source: {m.source}</p></details></div>);
}
export function Bars({ rows, max, fmt = v => String(v) }: { rows: [string, number][]; max?: number; fmt?: (v: number) => string }) {
  if (!rows.length) return <p className="muted">No data yet.</p>; const m = max ?? Math.max(1, ...rows.map(r => r[1]));
  return <div className="bars">{rows.map(([k, v]) => <div key={k} className="brow"><span className="bk">{k.replaceAll("_", " ")}</span><span className="bt"><i style={{ width: `${Math.max(2, (v / m) * 100)}%` }} /></span><span className="bv">{fmt(v)}</span></div>)}</div>;
}
export const Empty = ({ children }: { children: React.ReactNode }) => <div className="admempty">{children}</div>;
