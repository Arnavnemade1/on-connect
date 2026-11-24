"use client";
import { useProfile } from "@/lib/store";
import { useChat } from "@/lib/chat";
import { GLOSSARY, TOPICS } from "@/lib/content";
import type { TraceStep } from "@/lib/engine";

const LABELS: Record<string, string> = {
  DEVELOPMENTAL_ADAPTATION: "Adjusted complexity to your age profile", VOCABULARY_DEFINED: "Defined unfamiliar medical words", STEPWISE_EXPLANATION: "Used step-by-step explanations",
  EXAMPLE_ADDED: "Added familiar comparisons", SHORT_FORMAT: "Kept explanations short", SIMPLIFIED_ON_REQUEST: "Simplified when you asked", EXPANDED_ON_REQUEST: "Added detail when you asked",
  MEMORY_SIMPLIFIED: "Used chat memory to lower the level", MEMORY_EXPANDED: "Used chat memory to raise the level", CONFUSION_SCAFFOLDING: "Added extra support after you said it was confusing", ALTERNATE_STRATEGY: "Switched to a different explanation approach",
  GENERAL_KNOWLEDGE_ANSWER: "Answered from general knowledge (no approved content matched)", SAFETY_INDIVIDUAL_ADVICE_REDIRECT: "Pointed personal medical questions to your care team", SAFETY_SUPPORT_REDIRECT: "Encouraged you to talk to a trusted adult",
};
const pseudo = (t: TraceStep[]) => ["function respond(question, profile, memory):", ...t.map(s => `  ${String(s.n).padStart(2, "0")}  ${s.call}\n        → ${s.result}${s.status === "triggered" ? "   [RULE FIRED]" : s.status === "adapted" ? "   [ADAPTED]" : s.status === "skipped" ? "   [skipped]" : ""}`), "  return reply"].join("\n");

export default function Report() {
  const { active, ready } = useChat(); const msgs = active?.msgs ?? []; const [profile] = useProfile();
  if (!ready) return null;
  const bots = msgs.filter(m => m.reply);
  if (!bots.length) return <div className="card"><h1>Your Onconnect Session Report</h1><p>No conversation yet. Ask a question first, then come back.</p></div>;
  const asked = msgs.filter(m => m.role === "user").length;
  const topicIds = [...new Set(bots.map(m => m.reply!.topicId).filter(Boolean) as string[])];
  const adapt = [...new Set(bots.flatMap(m => m.reply!.adaptations))];
  const terms = [...new Set(topicIds.flatMap(id => TOPICS.find(t => t.id === id)?.terms ?? []))];
  const sources = [...new Set(bots.map(m => m.reply!.source).filter(Boolean))];
  const signals = bots.flatMap(m => m.reply!.signals ?? []);
  const shifts = bots.map(m => (m.reply!.memory?.levelShift ?? 0));
  const w = 360, h = 70; const pts = shifts.map((v, i) => `${shifts.length === 1 ? w / 2 : (i / (shifts.length - 1)) * w},${h / 2 - (v / 2) * (h / 2 - 6)}`).join(" ");
  const fbs = bots.filter(m => m.feedback);
  const last = bots[bots.length - 1].reply!;
  return (<>
    <div className="eyebrow">Session report</div><h1>How Onconnect adapted this conversation</h1>
    <div className="kpi"><div><b>{asked}</b><span>Questions</span></div><div><b>{adapt.length}</b><span>Adaptation types</span></div><div><b>{signals.length}</b><span>Signals detected</span></div><div><b>{(last.memory?.levelShift ?? 0)}</b><span>Final level shift</span></div></div>
    <div className="card"><h2>Overview</h2><ul><li>{new Date().toLocaleString()}</li><li>Topics: {topicIds.map(id => TOPICS.find(t => t.id === id)?.title).join(", ") || "general questions"}</li><li>Profile: ages {profile.age}, {profile.detail} detail</li></ul>
      <h3>Personalization applied</h3><ul>{adapt.map(a => <li key={a}>{LABELS[a] ?? a}</li>)}</ul></div>
    <div className="card"><h2>Memory evolution</h2><p className="muted">How the level shift (−2 simpler to +2 more advanced) changed after each reply.</p>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: 560 }} role="img" aria-label="Level shift over the conversation"><line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="var(--line)" /><polyline points={pts} fill="none" stroke="var(--blue)" strokeWidth="2" />{shifts.map((v, i) => <circle key={i} cx={shifts.length === 1 ? w / 2 : (i / (shifts.length - 1)) * w} cy={h / 2 - (v / 2) * (h / 2 - 6)} r="3.5" fill="var(--teal)" />)}</svg>
      {signals.length > 0 && <div style={{ marginTop: 8 }}>{signals.map((s, i) => <span key={i} className="tagl">{s}</span>)}</div>}</div>
    <div className="card"><h2>The algorithm, step by step</h2>
      <p className="muted" style={{ maxWidth: 680 }}>Each reply runs the same pipeline. Below is what actually ran for every reply in this conversation, with real inputs and results. Teal steps changed the response. Orange steps are rules that fired.</p>
      <div className="legend"><span>● ok</span><span style={{ color: "var(--teal)" }}>● adapted</span><span style={{ color: "#d9822b" }}>● rule fired</span><span>○ skipped</span></div>
      {bots.map((m, i) => <details key={m.id} open={i === bots.length - 1} style={{ marginTop: 14 }}><summary>Reply {i + 1}{!m.reply!.trace && " (saved before traces existed)"}: {m.reply!.topicId ?? "general"} <span className="muted">· {m.reply!.model}</span></summary>
        <div className="flow">{(m.reply!.trace ?? []).map((t, j) => <span key={t.n} style={{ display: "contents" }}>{j > 0 && <span className="arrow">→</span>}<span className={"node " + t.status} title={t.result}>{t.name}</span></span>)}</div>
        <pre className="algo">{pseudo(m.reply!.trace ?? [])}</pre></details>)}</div>
    <div className="card"><h2>Learning summary</h2><p>Medical words introduced: {terms.join(", ") || "none"}.</p><ul>{terms.map(t => <li key={t}><b>{t}</b>: {GLOSSARY[t]}</li>)}</ul>
      <p className="muted">Reading a topic does not mean it was mastered, so understanding was not assessed.</p>
      <h3>Sources</h3><ul>{sources.map(s => <li key={s}>{s}</li>)}</ul><h3>Your feedback</h3><p>{fbs.length ? fbs.map(m => m.feedback).join(", ") : "No feedback given."}</p></div>
    <div className="card"><h2>Limitations</h2><ul><li>Your diagnosis was not verified.</li><li>This is general educational information, not advice about your care.</li><li>No emotional or psychological assessment was made.</li><li>Memory updates come from keyword rules, not a validated psychological model.</li></ul>
      <button className="btn alt" onClick={() => window.print()}>Print</button></div></>);
}
