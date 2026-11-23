"use client";
import { useState } from "react";
import Link from "next/link";
import { ORGANS } from "@/lib/more";
import { TOPICS } from "@/lib/content";
export default function Anatomy() {
  const [id, setId] = useState("brain"); const [detail, setDetail] = useState(false); const [q, setQ] = useState("");
  const o = ORGANS.find(x => x.id === id)!;
  return (<><div className="eyebrow">Anatomy explorer</div><h1>Explore the body</h1>
    <p className="muted" style={{ maxWidth: 640 }}>A general illustration. It does not show your own body or your diagnosis.</p>
    <div className="grid2" style={{ marginTop: 16, gridTemplateColumns: "minmax(240px,320px) 1fr" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <svg viewBox="0 0 200 420" width="100%" style={{ maxWidth: 260 }} role="img" aria-label="Body diagram with selectable organs">
          <g fill="var(--soft)" stroke="var(--line)" strokeWidth="2"><circle cx="100" cy="38" r="32" /><rect x="56" y="76" width="88" height="170" rx="30" /><rect x="22" y="84" width="30" height="150" rx="14" /><rect x="148" y="84" width="30" height="150" rx="14" /><rect x="62" y="240" width="32" height="160" rx="14" /><rect x="106" y="240" width="32" height="160" rx="14" /></g>
          {ORGANS.map(x => <circle key={x.id} className={"organ" + (x.id === id ? " on" : "")} cx={x.x} cy={x.y} r={x.r * 0.6} onClick={() => setId(x.id)} tabIndex={0} role="button" aria-label={x.name} onKeyDown={e => e.key === "Enter" && setId(x.id)} />)}
        </svg></div>
      <div><div className="card"><input type="text" placeholder="Search body parts" value={q} onChange={e => setQ(e.target.value)} aria-label="Search body parts" />
        <div className="chips" style={{ marginTop: 10 }}>{ORGANS.filter(x => x.name.toLowerCase().includes(q.toLowerCase())).map(x => <button key={x.id} className={"chip" + (x.id === id ? " on" : "")} onClick={() => setId(x.id)}>{x.name}</button>)}</div></div>
        <div className="card"><h2>{o.name}</h2><p>{detail ? o.detail : o.simple}</p>
          <button className="btn alt sm" onClick={() => setDetail(d => !d)}>{detail ? "Show simple" : "Show detailed"}</button>
          <h3 style={{ marginTop: 16 }}>Related words</h3><div className="chips">{o.terms.map(x => <Link key={x} className="chip" style={{ textDecoration: "none" }} href={`/words?q=${encodeURIComponent(x)}`}>{x}</Link>)}</div>
          <h3 style={{ marginTop: 16 }}>Related procedures</h3><div className="chips">{o.procs.map(p => <Link key={p} className="chip" style={{ textDecoration: "none" }} href={`/procedures/${p}`}>{TOPICS.find(t => t.id === p)?.title}</Link>)}</div></div></div></div></>);
}
