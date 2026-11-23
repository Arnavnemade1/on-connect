"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useBookmarks, useLog, useMemory, useProfile, useViewed, type LogEvent, type Msg } from "@/lib/store";
import { WORDS } from "@/lib/more";
import { useChat } from "@/lib/chat";
import type { Reply } from "@/lib/engine";
import { TOPICS } from "@/lib/content";

const SUGGEST = [["What happens during a biopsy?", "Walk through the steps"], ["What is an MRI?", "Why it's loud and what to expect"], ["Can you explain a CT scan?", "How the pictures are made"], ["What does tissue mean?", "Look up a medical word"]];
const uid = () => Math.random().toString(36).slice(2, 10);

function Typed({ text, animate, onTick, onDone }: { text: string; animate: boolean; onTick: () => void; onDone: () => void }) {
  const [n, setN] = useState(animate ? 0 : text.length);
  const pos = useRef(0);
  useEffect(() => {
    if (!animate) return;
    const t = setInterval(() => {
      pos.current = Math.min(text.length, pos.current + 5);
      setN(pos.current); onTick();
      if (pos.current >= text.length) { clearInterval(t); onDone(); }
    }, 16);
    return () => clearInterval(t);
    /* eslint-disable-next-line */
  }, []);
  return <>{text.slice(0, n)}</>;
}

export default function Chat() {
  const [profile, , pready] = useProfile();
  const { active, activeId, ready, addMsg, patchMsg, newChat } = useChat();
  const msgs = active?.msgs ?? [];
  const [, setLog] = useLog(); const [marks, setMarks] = useBookmarks(); const [memory, setMemory] = useMemory(); const [, setViewed] = useViewed();
  const [pick, setPick] = useState<{ text: string; x: number; y: number } | null>(null);
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false); const [typing, setTyping] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null); const [drawer, setDrawer] = useState(false);
  const [listening, setListening] = useState(false); const [speaking, setSpeaking] = useState<string | null>(null); const [copied, setCopied] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null); const fresh = useRef(new Set<string>()); const ta = useRef<HTMLTextAreaElement>(null);
  const toBottom = () => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; };
  useEffect(toBottom, [msgs.length, busy]);
  useEffect(() => { setSel(null); setTyping(null); }, [activeId]);

  async function send(q: string, clar: string | null = null) {
    if (!q.trim() || busy) return;
    const last = [...msgs].reverse().find(m => m.reply?.topicId)?.reply?.topicId ?? null;
    const sid = addMsg({ id: uid(), role: "user", text: q }); setInput(""); setBusy(true);
    if (ta.current) ta.current.style.height = "auto";
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, profile, lastTopic: last, memory }) });
      const reply: Reply = await r.json(); const id = reply.id ?? uid();
      setMemory(reply.memory); if (reply.topicId) setViewed(v => [reply.topicId!, ...v.filter(x => x !== reply.topicId)].slice(0, 20));
      fresh.current.add(id); setTyping(id); addMsg({ id, role: "bot", text: reply.text, reply }); setSel(id);
      const ev: LogEvent = { id, session: sid, signals: reply.signals, levelShift: reply.memory.levelShift, targetGrade: reply.plan?.targetGrade ?? null, ts: reply.ts ?? new Date().toISOString(), age: profile.age, detail: profile.detail, format: profile.format, topic: reply.topicId, adaptations: reply.adaptations, source: reply.source,
        coverage: reply.coverage ?? null, grade: reply.metrics?.grade ?? null, words: reply.metrics?.words ?? null, model: reply.model ?? "unknown", promptVersion: reply.promptVersion ?? "", safety: reply.safety, clarification: clar, feedback: null };
      setLog(l => [...l, ev]);
    } catch { addMsg({ id: uid(), role: "bot", text: "Sorry, something went wrong. Please try again." }); }
    setBusy(false);
  }
  const fb = (id: string, f: Msg["feedback"]) => { patchMsg(id, { feedback: f }); setLog(l => l.map(e => e.id === id ? { ...e, feedback: f ?? null } : e)); };
  const speak = (m: Msg) => { const s = window.speechSynthesis; if (!s) return; if (speaking === m.id) { s.cancel(); setSpeaking(null); return; } s.cancel(); const u = new SpeechSynthesisUtterance(m.text); u.onend = () => setSpeaking(null); setSpeaking(m.id); s.speak(u); };
  const listen = () => { const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) { alert("Voice input isn't supported in this browser."); return; }
    const r = new SR(); r.lang = "en-US"; r.onresult = (e: any) => setInput(e.results[0][0].transcript); r.onend = () => setListening(false); setListening(true); r.start(); };
  const copy = (m: Msg) => { navigator.clipboard?.writeText(m.text); setCopied(m.id); setTimeout(() => setCopied(null), 1200); };
  const save = (m: Msg) => setMarks(b => b.some(x => x.id === m.id) ? b.filter(x => x.id !== m.id) : [...b, { id: m.id, title: TOPICS.find(t => t.id === m.reply?.topicId)?.title ?? "Explanation", text: m.text, ts: new Date().toISOString() }]);

  const onSel = () => { const sel = window.getSelection(); const t = sel?.toString().trim() ?? ""; if (!t || t.length > 40 || !sel?.anchorNode?.parentElement?.closest(".btext")) { setPick(null); return; }
    const r = sel.getRangeAt(0).getBoundingClientRect(); setPick({ text: t, x: r.left + r.width / 2, y: r.top }); };
  const def = pick ? WORDS.find(w => w.term.toLowerCase() === pick.text.toLowerCase().replace(/[^a-z ]/gi, "")) : null;
  if (!ready || !pready) return null;
  const rep = msgs.find(m => m.id === sel)?.reply ?? [...msgs].reverse().find(m => m.reply)?.reply;
  const lastTopic = [...msgs].reverse().find(m => m.reply?.topicId)?.reply?.topicId;
  const follow = lastTopic ? TOPICS.find(t => t.id === lastTopic)!.questions.slice(0, 3) : [];
  return (<div className="chatwrap">
    <div className="chathead"><span className="muted">Ages {profile.age} · {profile.detail} detail{!profile.updatedAt && <> · <Link href="/setup">set up profile</Link></>}</span>
      <button className="btn alt sm" onClick={() => setDrawer(d => !d)}>{drawer ? "Hide" : "Research"} panel</button></div>
    <div className="scroll" ref={scroller} onMouseUp={onSel}><div className="col760">
      {msgs.length === 0 && <div className="empty"><div className="bigmark">◐</div><h1>What would you like to understand?</h1>
        <p className="muted">Explanations adapted to you, with a clear record of how.</p>
        <div className="sugg">{SUGGEST.map(([t, d]) => <button key={t} onClick={() => send(t)}><b>{t}</b><span>{d}</span></button>)}</div></div>}
      {msgs.map(m => m.role === "user" ? <div key={m.id} className="umsg"><div>{m.text}</div></div> : (
        <div key={m.id} className={"bmsg" + (m.id === sel && drawer ? " sel" : "")}>
          <div className="av">◐</div>
          <div className="bbody" onClick={() => m.reply && setSel(m.id)}>
            <div className="btext"><Typed text={m.text} animate={fresh.current.has(m.id)} onTick={toBottom} onDone={() => { fresh.current.delete(m.id); setTyping(t => t === m.id ? null : t); }} /></div>
            {m.reply && typing !== m.id && <>
              {m.reply.source && <div className="muted" style={{ marginTop: 8 }}>Source: {m.reply.source}</div>}
              <details><summary>Why this explanation?</summary>
                {m.reply.safety?.startsWith("SUPPORT") ? <p>This was a safety message. Nothing was personalized.</p> : <>
                  <b>What Onconnect used</b><ul>{m.reply.used.map(u => <li key={u}>{u}</li>)}</ul>
                  <b>What Onconnect changed</b><ul>{m.reply.changed.map(u => <li key={u}>{u}</li>)}</ul></>}
                <b>What Onconnect did not do</b><ul>{m.reply.notDone.map(u => <li key={u}>{u}</li>)}</ul></details>
              <div className="acts">
                <button title="Copy" onClick={() => copy(m)}>{copied === m.id ? "✓" : "⧉"}</button>
                <button title="Read aloud" onClick={() => speak(m)}>{speaking === m.id ? "■" : "🔊"}</button>
                <button title="Helpful" className={m.feedback === "up" ? "on" : ""} onClick={() => fb(m.id, "up")}>👍</button>
                <button title="Not helpful" className={m.feedback === "down" ? "on" : ""} onClick={() => fb(m.id, "down")}>👎</button>
                <button title="Save" className={marks.some(b => b.id === m.id) ? "on" : ""} onClick={() => save(m)}>{marks.some(b => b.id === m.id) ? "★" : "☆"}</button>
                <button title="Simpler" onClick={() => { fb(m.id, "simpler"); send("Can you explain that more simply?", "SIMPLER"); }}>Simpler</button>
                <button title="More detail" onClick={() => { fb(m.id, "detail"); send("Can you give more detail?", "MORE_DETAIL"); }}>More detail</button>
                <button title="Research panel" onClick={() => { setSel(m.id); setDrawer(true); }}>ⓘ</button>
              </div></>}
          </div></div>))}
      {busy && <div className="bmsg"><div className="av">◐</div><div className="dots"><i /><i /><i /></div></div>}
      {!busy && !typing && follow.length > 0 && msgs.length > 0 && <div className="chips" style={{ margin: "8px 0 0 44px" }}>{follow.map(f => <button key={f} className="chip" onClick={() => send(f)}>{f}</button>)}</div>}
    </div></div>
    <div className="composer"><div className="col760">
      <form className="pill" onSubmit={e => { e.preventDefault(); send(input); }}>
        <textarea ref={ta} rows={1} value={input} placeholder="Ask about a procedure, scan, or medical word" aria-label="Your question"
          onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(160, e.target.scrollHeight) + "px"; }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        <button type="button" className={"icon" + (listening ? " on" : "")} onClick={listen} aria-label="Voice input">🎤</button>
        <button className="send" disabled={busy || !input.trim()} aria-label="Send">↑</button>
      </form>
      <div className="muted" style={{ textAlign: "center", marginTop: 8, fontSize: ".75rem" }}>General education only, not advice about your own care. Draft content pending clinician review.</div>
    </div></div>
    {pick && <div className="defpop" style={{ left: Math.max(8, Math.min(pick.x - 130, innerWidth - 270)), top: Math.max(8, pick.y - 12), transform: "translateY(-100%)" }} onMouseDown={e => e.preventDefault()}>
      {def ? <><b>{def.term}</b><p>{def.simple}</p><div className="muted">{def.example}</div></> : <p style={{ margin: 0 }}>“{pick.text}” isn't in the word list.</p>}
      <div className="row"><button className="btn sm" onClick={() => { send(`What does ${pick.text} mean?`); setPick(null); }}>Ask Onconnect</button><button className="btn alt sm" onClick={() => setPick(null)}>Close</button></div></div>}
    <aside className={"drawer" + (drawer ? " open" : "")}>
      <div className="drawerhead"><div><div className="eyebrow">Research panel</div><h2 style={{ margin: 0 }}>Live adaptation</h2></div><button className="ib" onClick={() => setDrawer(false)} aria-label="Close">✕</button></div>
      {!rep ? <p className="muted">Ask a question to see how the answer was adapted, measured and grounded.</p> : <>
        <div className="stat"><div><b>{rep.metrics?.grade ?? "–"}</b><span>Reading grade</span></div><div><b>{rep.metrics?.avgSentence ?? "–"}</b><span>Words / sentence</span></div><div><b>{rep.metrics?.terms ?? 0}</b><span>Med terms</span></div></div>
        <div className="muted">Key-concept coverage (heuristic)</div><div className="bar" style={{ margin: "6px 0 14px" }}><i style={{ width: `${(rep.coverage ?? 0) * 100}%` }} /></div>
        <div className="muted" style={{ marginBottom: 4 }}>Adaptation operations</div>
        <div>{rep.adaptations.length ? rep.adaptations.map(a => <span key={a} className="tagl">{a}</span>) : <span className="muted">None applied</span>}</div>
        <table style={{ marginTop: 14 }}><tbody>
          <tr><td className="muted">Profile</td><td>Ages {profile.age}</td></tr><tr><td className="muted">Model</td><td>{rep.model}</td></tr><tr><td className="muted">Prompt</td><td>{rep.promptVersion}</td></tr>
          <tr><td className="muted">Grounded in</td><td>{rep.source ?? "No retrieved content"}</td></tr><tr><td className="muted">Safety rule</td><td>{rep.safety ?? "None triggered"}</td></tr></tbody></table>
        <h3 style={{ marginTop: 18 }}>Chat memory</h3>
        <table><tbody><tr><td className="muted">Level shift</td><td>{memory.levelShift}</td></tr><tr><td className="muted">Length bias</td><td>{memory.lengthBias}</td></tr><tr><td className="muted">Scaffolding</td><td>{memory.scaffold}</td></tr><tr><td className="muted">Turns learned from</td><td>{memory.turns}</td></tr></tbody></table>
        <h3 style={{ marginTop: 18 }}>Algorithm trace</h3>
        <ol className="trace">{rep.trace?.map(t => <li key={t.n} className={t.status}><b>{t.name}</b><span>{t.result}</span></li>)}</ol>
        <p className="muted">Grade and coverage are automated heuristics, not clinical measures. <Link href="/report">Full report</Link> · <Link href="/method">Method</Link> · <Link href="/log">Audit log</Link></p></>}
    </aside>
  </div>);
}
