"use client";
import { useState } from "react";
import { GLOSSARY } from "@/lib/content";
export default function Words() {
  const [q, setQ] = useState("");
  const list = Object.entries(GLOSSARY).filter(([k, v]) => (k + v).toLowerCase().includes(q.toLowerCase())).sort();
  return (<div className="card"><h1>Medical words</h1>
    <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search words…" aria-label="Search words" />
    {list.map(([k, v]) => <p key={k}><b style={{ textTransform: "capitalize" }}>{k}</b><br />{v}</p>)}
    {!list.length && <p>No matches.</p>}</div>);
}
