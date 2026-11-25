"use client";
import { useState } from "react";
import { PROFILES, TOPICS, type Level } from "@/lib/content";
import { useRatings, type Rating } from "@/lib/store";
import { shareRating } from "@/lib/research";
const dl = (n: string, t: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/csv" })); a.download = n; a.click(); };
export default function Clinician() {
  const [rs, setRs, ready] = useRatings(); const [id, setId] = useState(TOPICS[0].id); const [acc, setAcc] = useState(0); const [fit, setFit] = useState(0); const [saf, setSaf] = useState(0); const [dec, setDec] = useState("Approve"); const [c, setC] = useState(""); const [who, setWho] = useState("");
  if (!ready) return null; const t = TOPICS.find(x => x.id === id)!; const mine = rs.filter(r => r.topic === id);
  const Scale = ({ v, set, l }: { v: number; set: (n: number) => void; l: string }) => <><label>{l}</label><div className="chips">{[1, 2, 3, 4, 5].map(n => <button key={n} className={"chip" + (v === n ? " on" : "")} onClick={() => set(n)}>{n}</button>)}</div></>;
  return (<><div className="eyebrow">Clinician review</div><h1>Review educational content</h1>
    <div className="banner">Reviews here are self-entered and unauthenticated: they cannot make content “approved”. They are a structured way to collect expert ratings for the study. Real approval needs verified clinician accounts.</div>
    <div className="chips" style={{ marginBottom: 16 }}>{TOPICS.map(x => { const n = rs.filter(r => r.topic === x.id).length; return <button key={x.id} className={"chip" + (id === x.id ? " on" : "")} onClick={() => setId(x.id)}>{x.title}{n ? ` (${n})` : ""}</button>; })}</div>
    <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="card"><h2>{t.title} · content v1</h2>{(Object.keys(PROFILES) as Level[]).map(l => <div key={l} style={{ marginBottom: 10 }}><div className="eyebrow">Ages {l}</div><p style={{ margin: 0 }}>{t.why[l]}</p></div>)}<h3>Steps</h3><ol>{t.steps.map(s => <li key={s}>{s}</li>)}</ol></div>
      <div className="card"><h2>Your review</h2><label>Name and credential (self-reported)</label><input type="text" value={who} onChange={e => setWho(e.target.value)} placeholder="e.g. pediatric nurse, RN" />
        <Scale v={acc} set={setAcc} l="Medical accuracy (1–5)" /><Scale v={fit} set={setFit} l="Age appropriateness (1–5)" /><Scale v={saf} set={setSaf} l="Safety and tone (1–5)" />
        <label>Decision</label><div className="chips">{["Approve", "Request revision", "Reject"].map(d => <button key={d} className={"chip" + (dec === d ? " on" : "")} onClick={() => setDec(d)}>{d}</button>)}</div>
        <label>Comments</label><textarea className="big" style={{ minHeight: 90 }} value={c} onChange={e => setC(e.target.value)} />
        <div className="row"><button className="btn" disabled={!acc || !fit || !saf || !who.trim()} onClick={() => { const row: Rating = { id: Math.random().toString(36).slice(2, 8), topic: id, decision: dec, accuracy: acc, ageFit: fit, safety: saf, comment: c, rater: who, ts: new Date().toISOString() }; setRs(a => [...a, row]); void shareRating(row); setAcc(0); setFit(0); setSaf(0); setC(""); }}>Submit review</button>
          <button className="btn alt" disabled={!rs.length} onClick={() => dl("onconnect-clinician-reviews.csv", ["id,topic,decision,accuracy,ageFit,safety,rater,ts,comment", ...rs.map(r => [r.id, r.topic, r.decision, r.accuracy, r.ageFit, r.safety, r.rater, r.ts, r.comment].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n"))}>Export CSV</button></div>
        <h3 style={{ marginTop: 18 }}>Review history</h3>{!mine.length && <p className="muted">No reviews for this topic.</p>}{mine.map(r => <div key={r.id} className="step"><span><b>{r.decision}</b> · acc {r.accuracy}, fit {r.ageFit}, safety {r.safety}<div className="muted">{r.rater} · {new Date(r.ts).toLocaleDateString()}</div>{r.comment && <div>{r.comment}</div>}</span></div>)}</div></div></>);
}
