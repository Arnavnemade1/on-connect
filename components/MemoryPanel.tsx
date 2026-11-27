"use client";
// The reader's own view of what Onconnect remembers (spec 7, 15.1, 22.2, 22.6 G): current settings against the starting point,
// every change with its reason and an undo, and every memory record with confirm, correct, mark outdated and delete.
import { useState } from "react";
import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { initialConfig, label, REGISTRY } from "@/lib/params";
import { editRecord, effective, eventLabel, reverseEvent, type Memory, type MemoryRecord } from "@/lib/memory";
import type { Profile } from "@/lib/engine";

const KIND: Record<MemoryRecord["kind"], string> = { explicit_preference: "Stated preference", observed_preference: "Observed pattern", educational_context: "Learning", communication_need: "Communication need", temporary_session: "This conversation only", medical_context: "Medical context (not verified)", profile: "Profile" };
export default function MemoryPanel({ memory, setMemory, profile, conv, compact = false, onChange }: { memory: Memory; setMemory: (m: Memory) => void; profile: Profile; conv: string | null; compact?: boolean; onChange?: (kind: string, detail: Record<string, unknown>) => void }) {
  const init = initialConfig(profile); const cur = effective(init, memory, conv, profile.updatedAt); const [edit, setEdit] = useState<{ id: string; text: string } | null>(null);
  const recs = memory.records.filter(r => r.status !== "expired" && r.status !== "deleted").slice().reverse();
  const events = memory.events.slice().reverse().slice(0, compact ? 8 : 40);
  const undo = (id: string) => { setMemory(reverseEvent(memory, id, init)); onChange?.("reversal", { event: id }); };
  const act = (id: string, a: "confirm" | "correct" | "outdated" | "delete", next?: string) => { const nm = editRecord(memory, id, a, next); setMemory(nm); onChange?.("record_edit", { record: nm.records.find(r => r.id === id), action: a }); setEdit(null); };
  return (<div className="mp">
    <h3>Current settings</h3><p className="muted">Named engineering settings, not validated scales. Bold means it differs from where your profile starts.</p>
    <table><thead><tr><th>Setting</th><th>Start</th><th>Now</th></tr></thead><tbody>{REGISTRY.map(p => <tr key={p.id} className={cur[p.id] !== init[p.id] ? "chg" : ""}><td title={p.describe}>{p.label}</td><td className="muted">{label(p.id, init[p.id])}</td><td>{label(p.id, cur[p.id])}</td></tr>)}</tbody></table>
    <h3>What changed and why</h3>
    {events.length ? <ol className="evs">{events.map(e => <li key={e.id} className={e.status}><div><b>{eventLabel(e)}</b> <span className="muted">{e.scope === "session" ? "this conversation" : "saved preference"} · {e.status}</span></div>
      <div className="muted">{e.rule} · “{e.evidence}”</div>{e.status === "applied" && e.trigger !== "reversal" && <button className="lnk" onClick={() => undo(e.id)}><RotateCcw size={12} />Undo</button>}</li>)}</ol> : <p className="muted">Nothing has changed yet. Say “simpler”, “more detail”, “I don&apos;t get it” or “I like pictures”.</p>}
    <h3>What it remembers</h3>
    {recs.length ? <ul className="recs">{recs.map(r => <li key={r.id} className={r.status}>
      <div className="rk"><span>{KIND[r.kind]}</span><span className="muted">{r.confidence} confidence · {r.status}{r.expiry === "end_of_session" ? " · ends with this conversation" : ""}</span></div>
      {edit?.id === r.id ? <form onSubmit={e => { e.preventDefault(); if (edit.text.trim()) act(r.id, "correct", edit.text.trim()); }}><input type="text" value={edit.text} onChange={e => setEdit({ id: r.id, text: e.target.value })} aria-label="Corrected memory" autoFocus /><div className="row"><button className="btn sm">Save correction</button><button type="button" className="btn alt sm" onClick={() => setEdit(null)}>Cancel</button></div></form>
        : <p>{r.content}</p>}
      <div className="muted rsrc">From {r.source.replaceAll("_", " ")} · {new Date(r.created).toLocaleDateString()}{r.history.length > 1 ? ` · ${r.history.length - 1} change${r.history.length > 2 ? "s" : ""}` : ""}</div>
      {edit?.id !== r.id && <div className="ra">{r.status === "unconfirmed" && <button className="lnk" onClick={() => act(r.id, "confirm")}><Check size={12} />That&apos;s right</button>}<button className="lnk" onClick={() => setEdit({ id: r.id, text: r.content })}><Pencil size={12} />Correct</button>{r.status !== "outdated" && <button className="lnk" onClick={() => act(r.id, "outdated")}>Mark outdated</button>}<button className="lnk" onClick={() => act(r.id, "delete")}><Trash2 size={12} />Delete</button></div>}
    </li>)}</ul> : <p className="muted">No memories yet.</p>}
    {!compact && <p className="muted">Deleting removes the content but keeps an audit entry that something was deleted, as the research protocol requires. Medical details you mention are never treated as verified.</p>}
  </div>);
}
