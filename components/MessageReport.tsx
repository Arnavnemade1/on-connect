"use client";
// Message report (spec 9.1 A–H, 14.1): what was intended, what the output measured, and why.
// Every number comes from the same builder as the session report. Missing data is left out, not shown as "n/a".
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Download, Info, Minus, Quote, X } from "lucide-react";
import { CARE_STAGES, type Profile, type Reply } from "@/lib/engine";
import type { Msg } from "@/lib/store";
import { REGISTRY, label } from "@/lib/params";
import { SOURCE_BY_ID, TYPE_LABEL } from "@/lib/sources";
import { langOf } from "@/lib/langs";
import { VERSION_LABEL, type Versions } from "@/lib/versions";
import { GUIDELINE_BY_ID, GREF_BY_KEY, strength } from "@/lib/guidelines";
import { checks as runChecks, messageMarkdown, messageSummary, messageTurn, sentenceRows, SIGNAL_LABEL, type CheckState } from "@/lib/report";

const ICON: Record<CheckState, typeof Check> = { yes: Check, no: X, note: Info, na: Minus };
const TRIGGER: Record<string, string> = { explicit_request: "Asked in this message", explicit_preference: "Stated preference", repeated_pattern: "Asked more than once", comprehension_check: "Quick check result", confusion_signal: "Said it was confusing", emotional_signal: "Stated a feeling", reversal: "Undo" };
const STATUS: Record<string, string> = { ok: "ran", adapted: "adapted", triggered: "fired", skipped: "skipped" };
const dash = (s: string) => s.replace("-", "–");
const refShort = (k: string) => { const r = GREF_BY_KEY[k]; if (!r) return k; const y = r.cite.match(/\((\d{4})\)/)?.[1]; return y ? `${r.cite.split(",")[0]}${/et al|&/.test(r.cite.split("(")[0]) ? " et al." : ""} ${y}` : r.cite.split(".")[0]; };
const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rp-sec"><header><h3>{title}</h3>{aside && <span className="muted">{aside}</span>}</header>{children}</section>;
}

/** Reading grade on a 0–14 track with the two-grade target band shaded. */
function GradeTrack({ grade, target }: { grade: number; target: number }) {
  const max = Math.max(14, Math.ceil(grade) + 1);
  return <div className="rp-track" aria-label={`Grade ${grade}, target ${target}`}><span className="band" style={{ left: pct(Math.max(0, target - 2), max), width: pct(4, max) }} /><span className="tgt" style={{ left: pct(target, max) }} /><span className={"dot" + (Math.abs(grade - target) <= 2 ? "" : " off")} style={{ left: pct(grade, max) }} /></div>;
}

export default function MessageReport({ reply: r, msg, next, profile, question = "" }: { reply: Reply; msg?: Msg; next?: Msg; profile: Profile; question?: string }) {
  const t = useMemo(() => messageTurn(question, msg ?? { id: r.id ?? "m", role: "bot", text: r.text, reply: r }, profile), [question, msg, r, profile]);
  const rows = useMemo(() => sentenceRows(r), [r]);
  const [copied, setCopied] = useState(false); const [allSteps, setAllSteps] = useState(false);
  if (!t) return null;

  const en = (r.lang ?? "en") === "en"; const legacy = !r.config; const c = r.citations; const events = r.events ?? [];
  const C = runChecks(t); const applicable = C.filter(k => k.state !== "na"); const passed = applicable.filter(k => k.state === "yes").length;
  const accessed = (r.ops ?? []).filter(o => o.op === "accessed"); const changedOps = (r.ops ?? []).filter(o => o.op !== "accessed");
  const tr = r.trace ?? []; const notable = tr.filter(s => s.status === "adapted" || s.status === "triggered");
  const cmp = t.compare; const maxG = cmp ? Math.max(14, ...cmp.readers.map(x => Math.ceil(x.grade) + 1)) : 14;
  const sup = c?.checks.filter(k => k.support === "supported").length ?? 0;
  const usedIn = (id: string) => rows.filter(s => s.cites.some(x => x.n === (r.sources ?? []).indexOf(id) + 1)).map(s => s.n);
  const outcome = [
    { k: "Quick check", v: msg?.check ? (msg.check.correct ? "Answered correctly" : "Missed, so the next answer changes approach") : r.teachback ? "Offered, not answered" : "Not offered", tone: msg?.check ? (msg.check.correct ? "ok" : "warn") : "" },
    { k: "Feedback", v: msg?.feedback === "up" ? "Helpful" : msg?.feedback === "down" ? "Not helpful" : msg?.feedback === "simpler" ? "Asked for simpler" : msg?.feedback === "detail" ? "Asked for more detail" : "None given", tone: msg?.feedback === "up" ? "ok" : msg?.feedback ? "warn" : "" },
    { k: "Next message", v: !next ? "Not yet" : next.reply?.signals?.length ? next.reply.signals.map(s => SIGNAL_LABEL[s]).join(", ") : "No clarification needed", tone: !next ? "" : next.reply?.signals?.length ? "warn" : "ok" },
  ];
  const copy = async () => { try { await navigator.clipboard.writeText(messageMarkdown(t, profile, question)); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} };
  const download = () => { const b = new Blob([JSON.stringify({ question, reply: { ...r, memory: undefined }, checks: C, sentences: rows }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `message-${r.id ?? "report"}.json`; a.click(); URL.revokeObjectURL(a.href); };

  return (<div className="rp">
    {question && <p className="rp-q">“{question}”</p>}
    <p className="rp-lede">{messageSummary(t, profile.age)}</p>
    {legacy && <p className="rp-legacy">Recorded by an earlier version{r.promptVersion ? ` (${r.promptVersion})` : ""}. It did not store settings, feelings or per-sentence citations, so those parts are left out.</p>}

    <div className="rp-tiles">
      <div className={"rp-tile " + (t.within == null ? "" : t.within ? "ok" : "bad")}><span>Reading grade</span>
        {t.grade != null && t.target != null ? <><b>{t.grade}<small> / {t.target}</small></b><GradeTrack grade={t.grade} target={t.target} /></> : <b className="na">{en ? "–" : "Not English"}</b>}</div>
      <div className={"rp-tile " + (t.words == null || t.maxWords == null ? "" : t.words <= t.maxWords * 1.1 ? "ok" : "bad")}><span>Length</span>
        {t.words != null ? <><b>{t.words}<small>{t.maxWords ? ` / ${t.maxWords} words` : " words"}</small></b>{t.maxWords && <div className="rp-meter"><i style={{ width: pct(t.words, t.maxWords * 1.1) }} /><em style={{ left: pct(t.maxWords, t.maxWords * 1.1) }} /></div>}</> : <b className="na">–</b>}</div>
      <div className={"rp-tile " + (!c || c.coverage == null ? "" : c.invalid ? "bad" : c.coverage >= 0.5 && !c.weak ? "ok" : "warn")}><span>Citations</span>
        {c && c.coverage != null ? <><b>{c.citedFactual}<small> / {c.factual} facts</small></b><div className="rp-seg">{c.checks.map((k, i) => <i key={i} className={k.support} />)}</div></> : <b className="na">{r.sources?.length ? "Topic-level" : "None"}</b>}</div>
      <div className={"rp-tile " + (applicable.length && passed === applicable.length ? "ok" : C.some(k => k.state === "no") ? "bad" : "warn")}><span>Checks passed</span><b>{passed}<small> / {applicable.length}</small></b><div className="rp-seg">{applicable.map(k => <i key={k.id} className={k.state} />)}</div></div>
    </div>

    {(events.length > 0 || r.revise || r.psych?.expressed || accessed.length > 0) && <Section title="Why it reads this way">
      <ol className="rp-causes">
        {events.map(e => <li key={e.id}><div className="ev">“{e.evidence}”</div><ArrowRight size={14} aria-hidden /><div><b>{label(e.param, e.prev)} → {label(e.param, e.next)}</b><span className="muted">{REGISTRY.find(p => p.id === e.param)?.label} · {TRIGGER[e.trigger] ?? e.trigger} · <code>{e.rule.split(" ")[0]}</code></span></div>
          <span className={"rp-scope " + e.scope}>{e.scope === "persistent" ? "Saved preference" : "This chat"}</span></li>)}
        {r.revise && <li><div className="ev">Earlier confusion or a missed check</div><ArrowRight size={14} aria-hidden /><div><b>Approach revised</b><span className="muted">{r.revise}</span></div><span className="rp-scope session">This answer</span></li>}
        {r.psych?.expressed && <li><div className="ev">Said they felt {r.psych.type}</div><ArrowRight size={14} aria-hidden /><div><b>{(r.psych.strategy ?? "No strategy").replaceAll("_", " ").toLowerCase().replace(/^./, x => x.toUpperCase())}</b><span className="muted">{r.psych.acknowledged ? "Feeling acknowledged" : "Acknowledgment not detected"}{r.psych.humanSupport ? " · trusted adult suggested" : ""} · never stored as a diagnosis</span></div><span className="rp-scope session">This chat</span></li>}
        {accessed.map(o => <li key={o.id}><div className="ev">Saved memory <code>{o.id}</code></div><ArrowRight size={14} aria-hidden /><div><b>{o.content}</b><span className="muted">{o.reason}</span></div><span className="rp-scope persistent">Memory</span></li>)}
      </ol></Section>}

    {r.guidance && <Section title="Guidelines used" aside={r.guidance.version}>
      {r.guidance.applied.length ? <ul className="rp-guides">{r.guidance.applied.map(id => { const g = GUIDELINE_BY_ID[id]; if (!g) return null;
        return <li key={id}><Link href={`/guidelines#${id}`}><code>{id}</code></Link><div><b>{g.situation}{g.crossCutting ? "" : ` · ages ${dash(g.age)}`}</b><span className="muted">{strength(g)} · {g.refs.slice(0, 3).map(refShort).join("; ")}</span></div></li>; })}</ul>
        : <p className="muted">Not given to the model in this evaluation arm. The answer was still checked against the reader&apos;s rows.</p>}
      {r.guidance.hits.length ? <p className="rp-hit">Used {r.guidance.hits.map(h => `“${h.match}”`).join(", ")}, which {r.guidance.hits.length === 1 ? "its row says" : "the rows say"} to avoid for this reader.</p> : <p className="rp-clean"><Check size={14} aria-hidden /> None of the words these {r.guidance.checked.length} rows warn against appeared.</p>}</Section>}

    {r.config && <Section title="Settings used" aside={r.configBefore ? "○ before · ● used" : undefined}>
      <div className="rp-dials">{REGISTRY.map(p => { const v = r.config![p.id]; const b = r.configBefore?.[p.id]; const chg = b != null && b !== v;
        return <div key={p.id} className={"rp-dial" + (chg ? " chg" : "")} title={p.describe}><span>{p.label}</span><span className="dots">{p.values.map((_, i) => <i key={i} className={i === v ? "on" : chg && i === b ? "was" : ""} />)}</span><em>{label(p.id, v)}</em></div>; })}</div></Section>}

    {rows.length > 0 && <Section title="Sentence by sentence" aside={en && t.target != null ? `target grade ${t.target}` : undefined}>
      <div className="rp-legend">{en && t.target != null && <><span><i className="l0" />On target</span><span><i className="l1" />A bit hard</span><span><i className="l2" />Hard</span></>}{c?.checks.length ? <><span><i className="supported" />Supported</span><span><i className="weak" />Weak match</span></> : null}</div>
      <ol className="rp-sents">{rows.map(s => <li key={s.n} className={en && t.target != null ? `l${s.level}` : ""}><p>{s.text}</p>
        <div className="meta">{en && <span>grade {s.grade}</span>}<span>{s.words} words</span>{s.cites.map((x, i) => <span key={i} className={"cite " + x.support}>{x.n ? `[${x.n}]` : "invalid"} {x.support === "supported" ? "supported" : x.support === "weak" ? "weak match" : "removed"}</span>)}{s.uncitedFact && <span className="cite uncited">fact without citation</span>}</div></li>)}</ol>
      {c?.method && <p className="rp-note">{c.method}</p>}</Section>}

    {cmp && <Section title="Same question, other readers" aside="template engine, for comparison">
      <div className="rp-ladder">{cmp.readers.map(x => <div key={x.age} className={"rung" + (x.actual ? " me" : "")}><span>Ages {dash(x.age)}</span>
        <div className="lane">{x.target != null && <em style={{ left: pct(x.target, maxG) }} />}<i style={{ width: pct(x.grade, maxG) }} /></div><b>{x.grade}</b><small>{x.words}w</small></div>)}</div>
      {cmp.noMemory && <p className="rp-note">Without this chat&apos;s memory the answer would aim at ages {dash(cmp.noMemory.level)}: grade {cmp.noMemory.grade}, {cmp.noMemory.words} words.</p>}
      <p className="rp-note">Bars show reading grade; the tick is each profile&apos;s target. The built-in templates answer the same question for every profile, so differences come from the adaptation rules, not from the model.</p></Section>}

    <Section title="Checks" aside={`${passed} of ${applicable.length} passed`}>
      <ul className="rp-checks">{C.map(k => { const I = ICON[k.state]; return <li key={k.id} className={k.state}><I size={14} aria-hidden /><div><b>{k.label}</b><span className="muted">{k.detail}</span></div></li>; })}</ul></Section>

    {(r.sources?.length ?? 0) > 0 && <Section title="Sources" aside={`${c?.cited.length ?? 0} of ${r.sources!.length} cited`}>
      <ol className="rp-srcs">{r.sources!.map((id, i) => { const s = SOURCE_BY_ID[id]; if (!s) return null; const u = usedIn(id);
        return <li key={id}><span className="num">{i + 1}</span><div><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a><span className="muted">{s.org} · {TYPE_LABEL[s.type]} · link checked {s.verified}</span>
          {s.passages[0] && <blockquote><Quote size={12} aria-hidden />{s.passages[0]}</blockquote>}
          <span className={"rp-use" + (u.length ? " on" : "")}>{u.length ? `Supports sentence${u.length > 1 ? "s" : ""} ${u.join(", ")}` : "Retrieved, not cited"}</span></div></li>; })}</ol>
      <p className="rp-note">{r.topicId ? `Approved content: ${r.source ?? r.topicId} (draft, pending clinician review).` : "No approved topic matched, so the answer relied on the sources above."}</p></Section>}

    {tr.length > 0 && <Section title="How it was made" aside={`${tr.length} steps · ${notable.length} changed something`}>
      <div className="rp-pipe">{tr.map(s => <i key={s.n} className={s.status} title={`${s.n}. ${s.name}: ${s.result}`} />)}</div>
      <ol className="rp-steps">{(allSteps ? tr : notable).map(s => <li key={s.n} className={s.status}><span className="st">{STATUS[s.status]}</span><div><b>{s.name.replaceAll("_", " ").toLowerCase()}</b>{s.component && <em>{s.component}</em>}<span>{s.result}</span></div></li>)}</ol>
      <button className="rp-more" onClick={() => setAllSteps(v => !v)}>{allSteps ? "Show only steps that changed something" : `Show all ${tr.length} steps`}</button></Section>}

    {changedOps.length > 0 && <Section title="Memory changes"><ul className="rp-ops">{changedOps.map((o, i) => <li key={i}><span className="rp-scope persistent">{o.op.replace("_", " ")}</span><div><b>{o.content}</b><span className="muted">{o.reason} · <code>{o.id}</code></span></div></li>)}</ul></Section>}

    <Section title="What happened next"><ol className="rp-next">{outcome.map(o => <li key={o.k} className={o.tone}><span>{o.k}</span><b>{o.v}</b></li>)}</ol>
      <p className="rp-note">What happened next is an association, not proof this answer caused it.</p></Section>

    <details className="rp-tech"><summary>Technical record</summary><dl>
      <div><dt>Message</dt><dd><code>{r.id ?? "–"}</code></dd></div><div><dt>Conversation</dt><dd><code>{r.conv ?? "this device"}</code></dd></div>
      {r.ts && <div><dt>Time</dt><dd>{new Date(r.ts).toLocaleString()}</dd></div>}<div><dt>Model</dt><dd>{r.model ?? "–"}{r.versions?.provider ? ` via ${r.versions.provider}` : ""}</dd></div>
      {r.latencyMs != null && <div><dt>Latency</dt><dd>{(r.latencyMs / 1000).toFixed(1)} s</dd></div>}
      <div><dt>Reader</dt><dd>{profile.role}, ages {dash(profile.age)}, {langOf(r.lang).name}{profile.stage ? `, ${CARE_STAGES.find(s => s[0] === profile.stage)?.[1]?.toLowerCase()}` : ""}</dd></div>
      {r.metrics && <div><dt>Text</dt><dd>{r.metrics.sentences} sentences, {r.metrics.avgSentence} words each, {r.metrics.terms} glossary terms{r.coverage != null ? `, ${Math.round(r.coverage * 100)}% concept coverage` : ""}</dd></div>}
      {r.versions ? (Object.keys(VERSION_LABEL) as (keyof Versions)[]).filter(k => r.versions![k]).map(k => <div key={k}><dt>{VERSION_LABEL[k]}</dt><dd><code>{r.versions![k]}</code></dd></div>) : r.promptVersion && <div><dt>Prompt</dt><dd><code>{r.promptVersion}</code></dd></div>}
    </dl></details>

    <div className="rp-actions"><button className="btn alt sm" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy as Markdown"}</button><button className="btn alt sm" onClick={download}><Download size={14} />JSON</button><Link href="/report" className="btn alt sm">Session report</Link></div>
  </div>);
}
