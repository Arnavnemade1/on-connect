"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChat } from "@/lib/chat";

const PAGES = [["/compare", "Compare ages"], ["/log", "Audit log"], ["/method", "Method"], ["/library", "Saved"], ["/words", "Medical words"], ["/questions", "My questions"], ["/report", "Session report"], ["/setup", "My profile"]] as const;

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter(); const { convos, activeId, select, newChat, remove } = useChat();
  const [dark, setDark] = useState(false); const [size, setSize] = useState(100);
  const [pal, setPal] = useState(false); const [q, setQ] = useState(""); const [side, setSide] = useState(false); const [find, setFind] = useState("");
  const isChat = path === "/" || path === "/chat";
  useEffect(() => { try { const t = localStorage.getItem("onc.theme"); setDark(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches); setSize(Number(localStorage.getItem("onc.size")) || 100); } catch {} }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; document.documentElement.style.fontSize = `${size}%`; try { localStorage.setItem("onc.theme", dark ? "dark" : "light"); localStorage.setItem("onc.size", String(size)); } catch {} }, [dark, size]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPal(o => !o); } if (e.key === "Escape") { setPal(false); setSide(false); } };
    addEventListener("keydown", h); return () => removeEventListener("keydown", h); }, []);
  useEffect(() => setSide(false), [path]);
  const go = (h: string) => { router.push(h); setPal(false); setQ(""); };
  const items = [["/", "New chat"], ...PAGES].filter(([, l]) => l.toLowerCase().includes(q.toLowerCase()));
  const list = convos.filter(c => c.title.toLowerCase().includes(find.toLowerCase()));
  return (<div className="app">
    <aside className={"side" + (side ? " open" : "")}>
      <div className="sidetop"><Link href="/" className="logo" onClick={newChat}><span className="mark">◐</span> Onconnect</Link>
        <button className="ib" onClick={() => setSide(false)} aria-label="Close menu" style={{ marginLeft: "auto" }}>✕</button></div>
      <button className="newchat" onClick={() => { newChat(); router.push("/"); }}>＋ New chat</button>
      <input className="find" type="text" placeholder="Search chats" value={find} onChange={e => setFind(e.target.value)} aria-label="Search chats" />
      <div className="convos">
        {list.length === 0 && <div className="muted" style={{ padding: "6px 10px" }}>{convos.length ? "No matches" : "No conversations yet"}</div>}
        {list.map(c => <div key={c.id} className={"citem" + (c.id === activeId && isChat ? " act" : "")}>
          <button onClick={() => { select(c.id); router.push("/"); }}>{c.title || "New chat"}</button>
          <button className="x" onClick={() => remove(c.id)} aria-label="Delete conversation">✕</button></div>)}
      </div>
      <div className="sidenav">{PAGES.map(([h, l]) => <Link key={h} href={h} className={path === h ? "act" : ""}>{l}</Link>)}</div>
      <div className="sidefoot"><button className="ib" onClick={() => setPal(true)}>⌘K</button>
        <button className="ib" onClick={() => setSize(s => Math.max(85, s - 10))} aria-label="Smaller text">A−</button>
        <button className="ib" onClick={() => setSize(s => Math.min(135, s + 10))} aria-label="Larger text">A+</button>
        <button className="ib" onClick={() => setDark(d => !d)} aria-label="Toggle dark mode">{dark ? "☀" : "☾"}</button></div>
    </aside>
    {side && <div className="scrim" onClick={() => setSide(false)} />}
    <div className="mainpane">
      <div className="topbar"><button className="ib menu" onClick={() => setSide(true)} aria-label="Open menu">☰</button><span className="tag">research prototype</span></div>
      {isChat ? children : <div className="page">{children}<footer className="foot">Onconnect is a research prototype for general education. It does not replace your doctors, nurses, or other healthcare professionals. Content is draft and pending clinician review. Data stays in this browser.</footer></div>}
    </div>
    {pal && <div className="overlay" onClick={() => setPal(false)}><div className="pal" onClick={e => e.stopPropagation()}>
      <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Jump to…" aria-label="Jump to" onKeyDown={e => { if (e.key === "Enter" && items[0]) go(items[0][0]); }} />
      {items.map(([h, l]) => <button key={h} onClick={() => go(h)}>{l}<span className="muted">{h}</span></button>)}</div></div>}
  </div>);
}
