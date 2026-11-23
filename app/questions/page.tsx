"use client";
import { useState } from "react";
import { TOPICS } from "@/lib/content";
import { useSaved } from "@/lib/store";
export default function Questions() {
  const [saved, setSaved, ready] = useSaved();
  const [topic, setTopic] = useState(TOPICS[0].id);
  const [custom, setCustom] = useState("");
  if (!ready) return null;
  const mine = saved.questions[topic] ?? [];
  const t = TOPICS.find(x => x.id === topic)!;
  const set = (qs: string[]) => setSaved({ ...saved, questions: { ...saved.questions, [topic]: qs } });
  const all = Object.entries(saved.questions).flatMap(([id, qs]) => qs.map(q => `${TOPICS.find(x => x.id === id)?.title}: ${q}`));
  return (<div className="card"><h1>My Questions</h1>
    <p>Build a list to bring to your healthcare team.</p>
    <div className="chips">{TOPICS.map(x => <button key={x.id} className={"chip" + (x.id === topic ? " on" : "")} onClick={() => setTopic(x.id)}>{x.title}</button>)}</div>
    <h2 style={{ marginTop: 16 }}>Ideas for {t.title}</h2>
    {t.questions.map(q => <p key={q}>{q} <button className="btn alt sm" disabled={mine.includes(q)} onClick={() => set([...mine, q])}>{mine.includes(q) ? "Added" : "Add"}</button></p>)}
    <form onSubmit={e => { e.preventDefault(); if (custom.trim()) { set([...mine, custom.trim()]); setCustom(""); } }}>
      <input type="text" value={custom} onChange={e => setCustom(e.target.value)} placeholder="Write your own question…" aria-label="Your own question" /></form>
    <h2 style={{ marginTop: 16 }}>My list</h2>
    {all.length ? <ul>{all.map(q => <li key={q}>{q}</li>)}</ul> : <p className="muted">Nothing yet.</p>}
    <button className="btn alt" onClick={() => window.print()}>Print list</button></div>);
}
