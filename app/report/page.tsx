"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Download, Printer } from "lucide-react";
import { useProfile } from "@/lib/store";
import { useChat } from "@/lib/chat";
import { SIGNAL_LABEL, adaptLabel, buildReport, fmt, reportMarkdown, type ReportData, type Turn } from "@/lib/report";

const download = (name: string, body: string, type: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type })); a.download = name; a.click(); };
const BADGE: Record<string, string> = { adapted: "adapted", triggered: "rule fired", skipped: "skipped", ok: "ran" };

/** Reading level of each answer against its target, with the ±2 grade band the app aims for. Squares mark answers outside the band. */
function LevelChart({ turns }: { turns: Turn[] }) {
  const W = 720, H = 280, L = 44, R = 20, T = 20, B = 40; const pts = turns.filter(t => t.grade != null && t.target != null);
  if (!pts.length) return <p className="muted">No English answers with a measured reading grade yet.</p>;
  const max = Math.max(14, Math.ceil(Math.max(...pts.map(t => Math.max(t.grade!, t.target! + 2))) + 1)); const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const x = (i: number) => (pts.length === 1 ? (L + W - R) / 2 : L + (i / (pts.length - 1)) * (W - L - R)); const half = pts.length === 1 ? 56 : 0;
  const hi = pts.map((t, i) => `${x(i) - half},${y(t.target! + 2)}`), lo = pts.map((t, i) => `${x(i) - half},${y(Math.max(0, t.target! - 2))}`);
  const band = pts.length === 1 ? `${x(0) - half},${y(pts[0].target! + 2)} ${x(0) + half},${y(pts[0].target! + 2)} ${x(0) + half},${y(Math.max(0, pts[0].target! - 2))} ${x(0) - half},${y(Math.max(0, pts[0].target! - 2))}` : [...hi, ...lo.reverse()].join(" ");
  const ticks = Array.from({ length: Math.floor(max / 2) + 1 }, (_, i) => i * 2);
  return (
    <figure className="rfig"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Measured reading grade against target for ${pts.length} answers`}>
      {ticks.map(g => <g key={g}><line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="gl" /><text x={L - 10} y={y(g) + 4} textAnchor="end" className="ax">{g}</text></g>)}
      <polygon points={band} className="band" />
      {pts.length > 1 && <polyline points={pts.map((t, i) => `${x(i)},${y(t.target!)}`).join(" ")} className="tgt" />}
      {pts.length === 1 && <line x1={x(0) - half} x2={x(0) + half} y1={y(pts[0].target!)} y2={y(pts[0].target!)} className="tgt" />}
      {pts.length > 1 && <polyline points={pts.map((t, i) => `${x(i)},${y(t.grade!)}`).join(" ")} className="meas" />}
      {pts.map((t, i) => <g key={t.id}>{t.within ? <circle cx={x(i)} cy={y(t.grade!)} r="5.5" className="dot" /> : <rect x={x(i) - 5.5} y={y(t.grade!) - 5.5} width="11" height="11" className="dot out" />}
        <text x={x(i)} y={y(t.grade!) - 13} textAnchor="middle" className="val">{t.grade}</text><text x={x(i)} y={H - 14} textAnchor="middle" className="ax">Reply {t.n}</text></g>)}
    </svg>
      <figcaption><span className="k"><i className="sw dot" />Measured grade</span><span className="k"><i className="sw sq" />Outside the band</span><span className="k"><i className="sw bandsw" />Target ±2 grades</span><span className="k"><i className="sw dash" />Target</span></figcaption></figure>);
}

/** One small chart per memory variable, each on its own scale. */
function Mini({ label, hint, values, min, max }: { label: string; hint: string; values: number[]; min: number; max: number }) {
  const W = 220, H = 84, P = 12; const x = (i: number) => (values.length === 1 ? W / 2 : P + (i / (values.length - 1)) * (W - 2 * P)); const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const last = values.at(-1) ?? 0;
  return (<div className="mini"><div className="mh"><span>{label}</span><b>{fmt(last)}</b></div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} across ${values.length} replies, ending at ${last}`}><line x1={P} x2={W - P} y1={y(0)} y2={y(0)} className="gl" />
      {values.length > 1 && <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} className="meas" />}{values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4.5 : 3} className="dot" />)}</svg>
    <p className="muted">{hint}</p></div>);
}

function Stepper({ t }: { t: Turn }) {
  const steps = t.reply.trace ?? [];
  if (!steps.length) return <p className="muted">This answer was saved before traces existed.</p>;
  return (<ol className="rsteps">{steps.map(s => <li key={s.n} className={s.status}><div className="sh"><span className="sn">{String(s.n).padStart(2, "0")}</span><b>{s.name.replaceAll("_", " ").toLowerCase()}</b><span className="badge">{BADGE[s.status]}</span></div>
    <div className="call">{s.call}</div><div className="res">{s.result}</div></li>)}</ol>);
}

function Report({ d, title }: { d: ReportData; title: string }) {
  const [copied, setCopied] = useState(false); const [open, setOpen] = useState<string | null>(d.turns.at(-1)?.id ?? null); const stamp = useMemo(() => new Date().toLocaleString(), []);
  const md = () => reportMarkdown(d, title);
  const copy = async () => { try { await navigator.clipboard.writeText(`${d.headline}\n\n${md()}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  const json = () => download("onconnect-session-report.json", JSON.stringify({ generated: new Date().toISOString(), profile: d.profile, headline: d.headline, turns: d.turns.map(t => ({ n: t.n, question: t.question, topic: t.reply.topicId, model: t.reply.model, promptVersion: t.reply.promptVersion, mode: t.reply.mode, lang: t.reply.lang,
    targetGrade: t.target, measuredGrade: t.grade, words: t.words, maxWords: t.maxWords, coverage: t.reply.coverage, signals: t.signals, memory: t.mem, adaptations: t.reply.adaptations, safety: t.reply.safety, source: t.reply.source, trace: t.reply.trace })) }, null, 2), "application/json");
  const pct = d.graded ? Math.round((d.within / d.graded) * 100) : null;
  const fb = Object.entries(d.feedback);

  return (<div className="rpt">
    <header className="rhead"><div className="eyebrow">Session report</div><h1>{title}</h1>
      <p className="lede">{d.headline}</p>
      <div className="meta"><span>{stamp}</span><span>Ages {d.profile.age}, {d.profile.detail} detail</span><span>{d.models.map(m => m === "onconnect-templates" ? "built-in templates" : m).join(", ")}</span></div>
      <div className="actions"><button className="btn" onClick={() => window.print()}><Printer size={15} />Print or save as PDF</button><button className="btn alt" onClick={() => download("onconnect-session-report.md", md(), "text/markdown")}><Download size={15} />Markdown</button>
        <button className="btn alt" onClick={json}><Download size={15} />Data (JSON)</button><button className="btn alt" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy summary"}</button></div>
      <nav className="toc2" aria-label="On this page">{[["#numbers", "Numbers"], ["#level", "Reading level"], ["#changed", "What changed"], ["#memory", "Memory"], ["#algo", "Algorithm"], ["#safe", "Safeguards"], ["#prov", "Provenance"], ["#learn", "Learning"], ["#limits", "Limits"]].map(([h, l]) => <a key={h} href={h}>{l}</a>)}</nav></header>

    {d.offlineTurns > 0 && <div className="callout"><b>{d.offlineTurns === d.turns.length ? "These answers came from the built-in template engine, not the AI model." : `${d.offlineTurns} of ${d.turns.length} answers came from the built-in template engine, not the AI model.`}</b> The model was unavailable at the time, so wording is less flexible and reading levels are less precise. Check the model status in the chat before drawing conclusions.</div>}

    <section id="numbers" className="rsec"><div className="nums">
      <div><b>{d.turns.length}</b><span>Answers</span></div>
      <div><b>{pct == null ? "n/a" : `${pct}%`}</b><span>Within 2 grades of target{d.graded ? ` (${d.within} of ${d.graded})` : ""}</span></div>
      <div><b>{d.meanGap ?? "n/a"}</b><span>Average grade gap</span></div>
      <div><b>{d.adaptations.length}</b><span>Kinds of adaptation</span></div>
      <div><b>{fmt(d.end.levelShift)}</b><span>Level shift now (start {fmt(d.start.levelShift)})</span></div>
      <div><b>{d.meanWords ?? "n/a"}</b><span>Average words per answer</span></div></div></section>

    <section id="level" className="rsec"><h2>Reading level against target</h2>
      <p className="sub">Each age profile has a target reading grade. The shaded band is the two-grade tolerance the app aims for, and each point is the Flesch–Kincaid grade measured on the real answer.</p>
      <LevelChart turns={d.turns} />
      <div className="wrap"><table><thead><tr><th>Reply</th><th>Topic</th><th>Target</th><th>Measured</th><th>Gap</th><th>Words</th><th>Coverage</th></tr></thead><tbody>
        {d.turns.map(t => <tr key={t.id}><td>{t.n}</td><td>{t.reply.topicId ?? "general"}</td><td>{t.target ?? "n/a"}</td><td>{t.grade ?? "n/a"}</td><td>{t.gap == null ? "n/a" : <>{t.gap.toFixed(1)} <span className="muted">{t.within ? "inside" : "outside"}</span></>}</td>
          <td>{t.words ?? "n/a"}{t.maxWords ? <span className="muted"> / {t.maxWords}</span> : null}</td><td>{t.reply.coverage != null ? `${Math.round(t.reply.coverage * 100)}%` : "n/a"}</td></tr>)}</tbody></table></div></section>

    <section id="changed" className="rsec"><h2>What changed, and why</h2>
      <p className="sub">For each question: what the reader said, how the memory moved, and which adaptations the answer used.</p>
      <ol className="rtl">{d.turns.map(t => <li key={t.id}><span className="tn">{t.n}</span><div>
        <p className="q">{t.question || "(question not saved)"}</p>
        <div className="chips2">{t.signals.length ? t.signals.map(s => <span key={s} className="sig">{SIGNAL_LABEL[s]}</span>) : <span className="muted">No feedback signal</span>}</div>
        <div className="deltas">{(["levelShift", "lengthBias", "scaffold"] as const).map(k => t.delta[k] !== 0 && <span key={k}>{k === "levelShift" ? "Level" : k === "lengthBias" ? "Length" : "Support"} {fmt(t.delta[k])} <i>now {fmt(t.mem[k])}</i></span>)}{t.delta.levelShift === 0 && t.delta.lengthBias === 0 && t.delta.scaffold === 0 && <span className="muted">Memory unchanged</span>}</div>
        <ul>{t.reply.adaptations.length ? t.reply.adaptations.map(a => <li key={a}>{adaptLabel(a)}</li>) : <li className="muted">No adaptations applied</li>}</ul></div></li>)}</ol></section>

    <section id="memory" className="rsec"><h2>How the memory moved</h2>
      <p className="sub">A small model of how this reader responds. Saying “simpler” or “I don&apos;t get it” moves it, and it carries into later answers.</p>
      <div className="minis"><Mini label="Level shift" hint="Reading level up (+) or down (−) from the age band." values={d.turns.map(t => t.mem.levelShift)} min={-2} max={2} />
        <Mini label="Length bias" hint="Longer (+) or shorter (−) answers." values={d.turns.map(t => t.mem.lengthBias)} min={-2} max={2} /><Mini label="Scaffolding" hint="Extra support: short sentences, examples, steps." values={d.turns.map(t => t.mem.scaffold)} min={0} max={3} /></div></section>

    <section id="algo" className="rsec"><h2>The algorithm, step by step</h2>
      <p className="sub">What actually ran for each answer, with its real inputs and results. “Adapted” steps changed the answer. “Rule fired” steps are safety or validation rules that triggered.</p>
      <div className="acc">{d.turns.map(t => <div key={t.id} className={"accitem" + (open === t.id ? " open" : "")}><button className="acch" aria-expanded={open === t.id} onClick={() => setOpen(o => (o === t.id ? null : t.id))}>
        <span className="tn">{t.n}</span><span className="accq">{t.question || "Reply " + t.n}</span><span className="muted">{(t.reply.trace ?? []).length} steps · {t.reply.model === "onconnect-templates" || !t.reply.model ? "templates" : t.reply.model}</span></button>
        {open === t.id && <Stepper t={t} />}</div>)}</div></section>

    <section id="safe" className="rsec"><h2>Safeguards</h2>
      {d.safeguards.length ? <ul className="plain">{d.safeguards.map((s, i) => <li key={i}><b>Reply {s.turn}, {s.name.replaceAll("_", " ").toLowerCase()}.</b> {s.result}</li>)}</ul> : <p>No safety rule fired in this conversation. Input checks, the output guard and the reading-level validation all ran on every answer.</p>}
      {d.regenerated > 0 && <p className="muted">{d.regenerated} {d.regenerated === 1 ? "answer was" : "answers were"} regenerated once because the first attempt was off target.</p>}</section>

    <section id="prov" className="rsec"><h2>Provenance</h2><p className="sub">Enough detail to reproduce or audit each answer.</p>
      <div className="wrap"><table><thead><tr><th>Reply</th><th>Model</th><th>Prompt</th><th>Mode</th><th>Language</th><th>Source</th><th>Time</th></tr></thead><tbody>
        {d.turns.map(t => <tr key={t.id}><td>{t.n}</td><td>{t.reply.model ?? "templates"}</td><td>{t.reply.promptVersion ?? "n/a"}</td><td>{t.reply.mode ?? "adaptive"}</td><td>{t.reply.lang ?? "en"}</td><td>{t.reply.source ?? "none"}</td><td>{t.reply.ts ? new Date(t.reply.ts).toLocaleTimeString() : "n/a"}</td></tr>)}</tbody></table></div></section>

    <section id="learn" className="rsec"><h2>Learning summary</h2>
      {d.glossary.length ? <dl className="gloss">{d.glossary.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl> : <p className="muted">No glossary terms were introduced.</p>}
      <p className="muted">Reading a topic does not mean it was mastered, so understanding was not assessed.</p>
      {d.sources.length > 0 && <><h3>Sources</h3><ul className="plain">{d.sources.map(s => <li key={s}>{s}</li>)}</ul></>}
      <h3>Feedback given</h3><p>{fb.length ? fb.map(([k, v]) => `${k} ×${v}`).join(", ") : "No feedback given."}</p></section>

    <section id="limits" className="rsec"><h2>Limits of this report</h2>
      <ul className="plain"><li>Reading grade uses the Flesch–Kincaid formula and works for English only. Coverage is a keyword heuristic. Neither is a clinical measure.</li><li>Memory updates come from keyword rules, not a validated psychological model.</li>
        <li>No diagnosis was verified and no emotional or psychological assessment was made.</li><li>This is general education, not advice about anyone&apos;s own care. Content is a draft pending clinician review.</li></ul>
      <Link href="/method" className="textlink2">Read the full method <ArrowRight size={14} /></Link></section>
    <p className="printfoot">Onconnect session report · {stamp} · General education only, not advice about your own care.</p>
  </div>);
}

export default function ReportPage() {
  const { active, convos, select, ready } = useChat(); const [profile] = useProfile();
  const withReplies = convos.filter(c => c.msgs.some(m => m.reply));
  const conv = active && active.msgs.some(m => m.reply) ? active : withReplies[0];      // fall back to the latest conversation that has answers
  const d = useMemo(() => buildReport(conv?.msgs ?? [], profile), [conv, profile]);
  if (!ready) return null;
  if (!d.turns.length) return (<div className="rpt"><header className="rhead"><div className="eyebrow">Session report</div><h1>How Onconnect adapted this conversation</h1>
    <p className="lede">There is nothing to report yet. Ask a question, say “simpler” or “I don&apos;t get it” once, and the report will show how the reading level and memory moved.</p><div className="actions"><Link href="/chat" className="btn">Start a conversation <ArrowRight size={15} /></Link></div></header></div>);
  return (<>
    {withReplies.length > 1 && <div className="rpick"><label htmlFor="conv">Conversation</label><select id="conv" value={conv?.id ?? ""} onChange={e => select(e.target.value)}>{withReplies.map(c => <option key={c.id} value={c.id}>{c.title || "New chat"} · {new Date(c.ts).toLocaleDateString()}</option>)}</select></div>}
    <Report key={conv?.id} d={d} title={conv?.title ? `“${conv.title}”` : "How Onconnect adapted this conversation"} />
  </>);
}
