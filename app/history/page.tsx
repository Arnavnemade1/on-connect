"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cloud, CloudOff, Trash2 } from "lucide-react";
import { useChat } from "@/lib/chat";
import { useSync } from "@/components/SyncProvider";
/** Personal conversation history (spec 21.1): chronological, titled, reopenable, deletable, with saved status. */
export default function History() {
  const { convos, select, remove } = useChat(); const { user, configured } = useSync(); const router = useRouter(); const [q, setQ] = useState(""); const [confirm, setConfirm] = useState<string | null>(null);
  const list = [...convos].filter(c => (c.title || "").toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.msgs.at(-1)?.reply?.ts ?? b.ts).localeCompare(a.msgs.at(-1)?.reply?.ts ?? a.ts));
  return (<><div className="eyebrow">You</div><h1>Conversation history</h1>
    <p>{configured ? (user ? <><Cloud size={15} style={{ verticalAlign: "-2px" }} /> Saved to your account and synced across devices.</> : <><CloudOff size={15} style={{ verticalAlign: "-2px" }} /> Kept only in this browser. <Link href="/account">Sign in</Link> to save them to an account.</>) : "Kept only in this browser."}</p>
    {convos.length > 5 && <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" style={{ maxWidth: 420, marginBottom: 24 }} />}
    {!list.length ? <p className="muted">No conversations yet. <Link href="/chat">Start one</Link>.</p> :
      <ol className="hist">{list.map(c => { const n = c.msgs.filter(m => m.role === "user").length; const last = c.msgs.at(-1)?.reply?.ts ?? c.ts; return <li key={c.id}>
        <button className="hmain" onClick={() => { select(c.id); router.push("/chat"); }}><b>{c.title || "New chat"}</b><span className="muted">{new Date(last).toLocaleString()} · {n} question{n === 1 ? "" : "s"}</span></button>
        <button className="lnk" onClick={() => { select(c.id); router.push("/report"); }}>Report</button>
        {confirm === c.id ? <><button className="lnk danger" onClick={() => { remove(c.id); setConfirm(null); }}>Delete</button><button className="lnk" onClick={() => setConfirm(null)}>Keep</button></> : <button className="lnk" onClick={() => setConfirm(c.id)} aria-label={`Delete ${c.title}`}><Trash2 size={14} /></button>}</li>; })}</ol>}
    <p className="muted">Deleting removes the conversation from this device{user ? " and, at the next sync, from your account" : ""}.</p></>);
}
