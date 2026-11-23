"use client";
import { useLog } from "@/lib/store";
function download(name: string, text: string, type: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
export default function Log() {
  const [log, setLog, ready] = useLog();
  if (!ready) return null;
  const csv = () => { const h = ["id", "session", "ts", "age", "detail", "topic", "adaptations", "source", "coverage", "grade", "words", "model", "promptVersion", "safety", "clarification", "feedback"];
    const esc = (v: unknown) => `"${String(Array.isArray(v) ? v.join("|") : v ?? "").replace(/"/g, '""')}"`;
    download("onconnect-audit-log.csv", [h.join(","), ...log.map(e => h.map(k => esc((e as any)[k])).join(","))].join("\n"), "text/csv"); };
  const avg = (k: "grade" | "coverage") => { const v = log.map(e => e[k]).filter((x): x is number => x != null); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : "–"; };
  return (<>
    <div className="eyebrow">Personalization audit</div><h1>Event log</h1>
    <p className="muted" style={{ maxWidth: 680 }}>Every AI response is recorded with what was actually applied, not what the model claims. Data is stored only in this browser.</p>
    <div className="stat" style={{ maxWidth: 520 }}><div><b>{log.length}</b><span>Events</span></div><div><b>{avg("grade")}</b><span>Mean grade</span></div><div><b>{avg("coverage")}</b><span>Mean coverage</span></div></div>
    <div className="row" style={{ marginBottom: 16 }}><button className="btn" disabled={!log.length} onClick={csv}>Export CSV</button>
      <button className="btn alt" disabled={!log.length} onClick={() => download("onconnect-audit-log.json", JSON.stringify(log, null, 2), "application/json")}>Export JSON</button>
      <button className="btn alt" disabled={!log.length} onClick={() => confirm("Clear the log?") && setLog([])}>Clear</button></div>
    <div className="card wrap">{!log.length ? <p className="muted">No events yet. Ask a question in the chat.</p> :
      <table><thead><tr><th>Time</th><th>Topic</th><th>Age</th><th>Adaptations</th><th>Grade</th><th>Coverage</th><th>Model</th><th>Safety</th><th>Feedback</th></tr></thead>
        <tbody>{[...log].reverse().map(e => <tr key={e.id}><td>{new Date(e.ts).toLocaleTimeString()}<div className="muted">{e.id}</div></td><td>{e.topic ?? "–"}</td><td>{e.age}</td>
          <td>{e.adaptations.map(a => <span key={a} className="tagl">{a}</span>)}{e.clarification && <span className="tagl">CLARIFY:{e.clarification}</span>}</td>
          <td>{e.grade ?? "–"}</td><td>{e.coverage ?? "–"}</td><td>{e.model}<div className="muted">{e.promptVersion}</div></td><td>{e.safety ?? "–"}</td><td>{e.feedback ?? "–"}</td></tr>)}</tbody></table>}</div></>);
}
