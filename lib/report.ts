// Session (Level 2) and aggregate (Level 3) report builders (spec Parts IX, X, XIV, 22.1).
// Pure functions: every number comes from saved replies, events and checks. Nothing is estimated or invented,
// and associations are never described as causes (spec 10.3, 12.7).
import type { CheckResult, LogEvent, Msg } from "./store";
import { respond, type Profile, type Reply, type Psych } from "./engine";
import { DEFAULT_MEMORY, eventLabel, type AdaptEvent, type MemOp, type Signal } from "./memory";
import { metrics } from "./metrics";
import { GLOSSARY, LEVELS, TOPICS } from "./content";
import { initialConfig, label, PARAM, REGISTRY, type Config, type ParamId } from "./params";
import type { CitationReport } from "./sources";

export const SIGNAL_LABEL: Record<Signal, string> = { CONFUSED: "Said it was confusing", SIMPLER: "Asked for simpler", MORE_DETAIL: "Asked for more detail", SHORTER: "Asked for shorter", LONGER: "Asked for longer", UNDERSTOOD: "Said they understood", WANTS_EXAMPLE: "Wanted an example", WANTS_STEPS: "Wanted steps" };
export const ADAPT_LABEL: Record<string, string> = {
  DEVELOPMENTAL_ADAPTATION: "Wrote for the developmental profile", VOCABULARY_DEFINED: "Defined medical words", STEPWISE_EXPLANATION: "Used step-by-step explanation", EXAMPLE_ADDED: "Added a familiar comparison",
  SHORT_FORMAT: "Kept it to the core idea", SIMPLIFIED_ON_REQUEST: "Simplified when asked", EXPANDED_ON_REQUEST: "Added detail when asked", MEMORY_SIMPLIFIED: "Lowered the reading level from memory", MEMORY_EXPANDED: "Raised the reading level from memory",
  CONFUSION_SCAFFOLDING: "Added support after confusion", ALTERNATE_STRATEGY: "Changed explanation approach (revision)", VISUAL_SUPPORT: "Pointed to a picture-based explanation", GENERAL_KNOWLEDGE_ANSWER: "Answered without approved content",
  SAFETY_INDIVIDUAL_ADVICE_REDIRECT: "Pointed a personal question to the care team", SAFETY_SUPPORT_REDIRECT: "Crisis message: trusted adult and 988", OUTPUT_GUARD_REDIRECT: "Output guard added a care-team note", COMMUNITY_RESOURCE_MATCH: "Suggested a verified support organization",
  FALSE_REASSURANCE_FLAG: "Flagged possible false reassurance",
};
export const adaptLabel = (a: string) => ADAPT_LABEL[a] ?? (a.startsWith("PSYCH_") ? `Emotional strategy: ${a.slice(6).toLowerCase().replaceAll("_", " ")}` : a.startsWith("TRANSLATED_") ? `Translated (${a.slice(11).toLowerCase()})` : a.toLowerCase().replaceAll("_", " "));
export const KEY_PARAMS: ParamId[] = ["reading_level", "explanation_depth", "response_length", "concept_density", "analogy_usage", "teachback_frequency"];

export type Effect = "Reversed" | "Supported by observed evidence" | "Not supported (same request again)" | "Evaluated (no repeat request)" | "Awaiting further evaluation";
export interface Turn {
  n: number; id: string; question: string; reply: Reply;
  grade: number | null; target: number | null; gap: number | null; within: boolean | null; words: number | null; maxWords: number | null;
  signals: Signal[]; cfg: Config; before: Config; events: AdaptEvent[]; ops: MemOp[]; offline: boolean; feedback?: Msg["feedback"]; compare: Compare | null;
  check: CheckResult | null; psych: Psych | null; citations: CitationReport | null; latency: number | null;
}
export interface Safeguard { turn: number; name: string; result: string; }
export interface ReportData {
  turns: Turn[]; asked: number; topics: { id: string; title: string }[]; terms: string[]; glossary: [string, string][]; sources: string[]; adaptations: string[];
  graded: number; within: number; meanGap: number | null; meanWords: number | null; start: Config; end: Config; models: string[]; offlineTurns: number; regenerated: number;
  safeguards: Safeguard[]; feedback: Record<string, number>; headline: string; profile: Profile; insights: Insight[];
  events: (AdaptEvent & { turn: number; effect: Effect })[]; memoryChanges: number; checks: { n: number; correct: number }; emotions: { turn: number; type: string; strategy: string | null; acknowledged: boolean | null }[];
  citation: { answers: number; factual: number; cited: number; weak: number; invalid: number }; versions: string[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const join = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.length === 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const PROBLEM: Partial<Record<ParamId, Signal[]>> = { explanation_depth: ["SIMPLER", "MORE_DETAIL", "CONFUSED"], reading_level: ["SIMPLER", "MORE_DETAIL", "CONFUSED"], terminology_density: ["SIMPLER", "CONFUSED"], response_length: ["SHORTER", "LONGER"], concept_density: ["CONFUSED", "SIMPLER"], analogy_usage: ["CONFUSED", "WANTS_EXAMPLE"], structure: ["WANTS_STEPS"] };

/** Spec 8.5: a change is never called an improvement by default. It is classified from what happened next in the same conversation. */
function effect(e: AdaptEvent, turns: Turn[], at: number): Effect {
  if (e.status === "reversed") return "Reversed";
  const later = turns.slice(at); const t = turns[at - 1]?.reply.topicId;
  if (later.some(x => x.check?.correct && (!t || x.check.topic === t)) || turns[at - 1]?.check?.correct) return "Supported by observed evidence";
  const next = turns[at]; if (!next) return "Awaiting further evaluation";
  const same = (PROBLEM[e.param] ?? []).filter(s => e.next < e.prev ? ["SIMPLER", "CONFUSED", "SHORTER"].includes(s) : ["MORE_DETAIL", "LONGER"].includes(s));
  return next.signals.some(s => same.includes(s)) ? "Not supported (same request again)" : "Evaluated (no repeat request)";
}

export function buildReport(msgs: Msg[], profile: Profile): ReportData {
  const turns: Turn[] = []; let lastUser = ""; const init = initialConfig(profile);
  for (const m of msgs) {
    if (m.role === "user") { lastUser = m.text; continue; }
    const r = m.reply; if (!r) continue;
    const english = (r.lang ?? "en") === "en"; const grade = english && r.metrics ? r.metrics.grade : null; const target = r.plan?.targetGrade ?? null;
    const gap = grade != null && target != null ? Math.abs(grade - target) : null; const cfg = r.config ?? init; const before = r.configBefore ?? turns.at(-1)?.cfg ?? init;
    const hadMemory = REGISTRY.some(p => cfg[p.id] !== init[p.id]);
    turns.push({ n: turns.length + 1, id: m.id, question: lastUser, reply: r, grade, target, gap, within: gap == null ? null : gap <= 2, words: r.metrics?.words ?? null, maxWords: r.plan?.maxWords ?? null,
      signals: r.signals ?? [], cfg, before, events: r.events ?? [], ops: r.ops ?? [], offline: (r.model ?? "onconnect-templates") === "onconnect-templates", feedback: m.feedback,
      compare: english ? compare(lastUser, turns.at(-1)?.reply.topicId ?? null, profile, r.plan?.level, hadMemory) : null, check: m.check ?? null, psych: r.psych ?? null, citations: r.citations ?? null, latency: r.latencyMs ?? null });
  }
  const graded = turns.filter(t => t.gap != null); const within = graded.filter(t => t.within).length;
  const topics = uniq(turns.map(t => t.reply.topicId).filter(Boolean) as string[]).map(id => ({ id, title: TOPICS.find(t => t.id === id)?.title ?? id }));
  const terms = uniq(topics.flatMap(t => TOPICS.find(x => x.id === t.id)?.terms ?? []));
  const safeguards: Safeguard[] = turns.flatMap(t => (t.reply.trace ?? []).filter(s => s.status === "triggered").map(s => ({ turn: t.n, name: s.name, result: s.result })));
  const regenerated = turns.filter(t => (t.reply.trace ?? []).some(s => /regenerat/i.test(s.result))).length;
  const feedback: Record<string, number> = {}; turns.forEach(t => { if (t.feedback) feedback[t.feedback] = (feedback[t.feedback] ?? 0) + 1; });
  const start = turns[0]?.before ?? init; const end = turns.at(-1)?.cfg ?? init;
  const meanGap = r1(mean(graded.map(t => t.gap!))); const meanWords = r1(mean(turns.map(t => t.words).filter((x): x is number => x != null)));
  const events = turns.flatMap(t => t.events.map(e => ({ ...e, turn: t.n, effect: effect(e, turns, t.n) })));
  const checksDone = turns.filter(t => t.check); const cits = turns.filter(t => t.citations && t.citations.coverage != null);

  const parts: string[] = [];
  parts.push(`${turns.length} ${turns.length === 1 ? "answer" : "answers"} on ${topics.length ? join(topics.map(t => t.title.toLowerCase())) : "general questions"}.`);
  if (graded.length) parts.push(`${within} of ${graded.length} landed within two grades of the target reading level${meanGap != null ? ` (average gap ${meanGap} grades)` : ""}.`);
  if (events.length) { const changed = REGISTRY.filter(p => start[p.id] !== end[p.id]); parts.push(`${events.length} adaptation ${events.length === 1 ? "event was" : "events were"} recorded${changed.length ? `; by the end, ${join(changed.slice(0, 3).map(p => `${p.label.toLowerCase()} had moved from ${label(p.id, start[p.id]).toLowerCase()} to ${label(p.id, end[p.id]).toLowerCase()}`))}` : ""}.`); }
  else parts.push("No feedback signals were detected, so the settings stayed at the profile's starting point.");
  if (checksDone.length) parts.push(`${checksDone.filter(t => t.check!.correct).length} of ${checksDone.length} comprehension checks were answered correctly.`);
  const safety = safeguards.filter(x => !["VALIDATE", "OUTPUT_GUARD", "CITATION_CHECK", "REASSURANCE_CHECK"].includes(x.name)); const flagged = safeguards.filter(x => x.name === "VALIDATE").length;
  if (safety.length) parts.push(`${safety.length} safety ${safety.length === 1 ? "rule" : "rules"} fired.`);
  if (flagged) parts.push(`The reading-level validator flagged ${flagged} ${flagged === 1 ? "answer" : "answers"} as off target.`);

  const d: ReportData = { turns, asked: msgs.filter(m => m.role === "user").length, topics, terms, glossary: terms.filter(t => GLOSSARY[t]).map(t => [t, GLOSSARY[t]] as [string, string]),
    sources: uniq(turns.flatMap(t => t.reply.sources ?? [])), adaptations: uniq(turns.flatMap(t => t.reply.adaptations)), graded: graded.length, within, meanGap, meanWords, start, end,
    models: uniq(turns.map(t => t.reply.model ?? "onconnect-templates")), offlineTurns: turns.filter(t => t.offline).length, regenerated, safeguards, feedback, headline: parts.join(" "), profile, insights: [],
    events, memoryChanges: turns.reduce((s, t) => s + t.ops.filter(o => o.op !== "accessed" && o.op !== "confirmed").length, 0), checks: { n: checksDone.length, correct: checksDone.filter(t => t.check!.correct).length },
    emotions: turns.filter(t => t.psych?.expressed || t.psych?.declined).map(t => ({ turn: t.n, type: t.psych!.declined ? "asked not to discuss feelings" : t.psych!.type ?? "", strategy: t.psych!.strategy, acknowledged: t.psych!.acknowledged })),
    citation: { answers: cits.length, factual: cits.reduce((s, t) => s + t.citations!.factual, 0), cited: cits.reduce((s, t) => s + t.citations!.citedFactual, 0), weak: cits.reduce((s, t) => s + t.citations!.weak, 0), invalid: cits.reduce((s, t) => s + t.citations!.invalid, 0) },
    versions: uniq(turns.map(t => t.reply.versions?.system ?? t.reply.promptVersion ?? "unknown")) };
  d.insights = insights(d);
  return d;
}

export const fmt = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

export function reportMarkdown(d: ReportData, title: string): string {
  const L: string[] = [`# Onconnect session report`, `_${title} · generated ${new Date().toLocaleString()} · ages ${d.profile.age}, ${d.profile.detail} detail_`, "", d.headline, "",
    ...(d.insights.length ? ["## Key findings", "", ...d.insights.map(f => `- ${f.text}`), ""] : []),
    "## Measurements", "", "| Reply | Topic | Target grade | Measured grade | Words | Signals | Reading level used | Model |", "|---|---|---|---|---|---|---|---|"];
  d.turns.forEach(t => L.push(`| ${t.n} | ${t.reply.topicId ?? "general"} | ${t.target ?? "n/a"} | ${t.grade ?? "n/a"} | ${t.words ?? "n/a"}${t.maxWords ? ` / ${t.maxWords}` : ""} | ${t.signals.map(s => SIGNAL_LABEL[s]).join("; ") || "none"} | ${label("reading_level", t.cfg.reading_level)} | ${t.reply.model ?? "templates"} |`));
  if (d.events.length) { L.push("", "## Adaptation events", "", "| Event | Reply | Change | Scope | Trigger | Rule | Outcome |", "|---|---|---|---|---|---|---|"); d.events.forEach(e => L.push(`| ${e.id} | ${e.turn} | ${eventLabel(e)} | ${e.scope} | ${e.trigger.replaceAll("_", " ")} | ${e.rule} | ${e.effect} |`)); }
  L.push("", "## Quality checks", "", `| Check | ${d.turns.map(t => `Reply ${t.n}`).join(" | ")} |`, `|---|${d.turns.map(() => "---").join("|")}|`);
  const rows = d.turns.map(t => checks(t)); rows[0]?.forEach((c, i) => L.push(`| ${c.label} | ${rows.map(r => r[i].state === "na" ? "n/a" : r[i].state).join(" | ")} |`));
  L.push("", "## What changed and why", ""); d.turns.forEach(t => { L.push(`**${t.n}. ${t.question || "(no question)"}**`, ...t.reply.adaptations.map(a => `- ${adaptLabel(a)}`), ""); });
  if (d.safeguards.length) L.push("## Rules that fired", "", ...d.safeguards.map(s => `- Reply ${s.turn}, ${s.name}: ${s.result}`), "");
  L.push("## Method and limits", "", "- Reading grade is the Flesch–Kincaid formula (English only); coverage and citation support are keyword heuristics. None is a clinical measure.", "- Adaptation parameters are named engineering settings, not validated scales. Outcomes after a change are associations within one conversation, not causes.",
    "- Understanding was only checked where a teach-back question was answered; an immediate correct answer does not establish retention.", "- This is general education, not advice about anyone's own care.", d.offlineTurns ? `- ${d.offlineTurns} ${d.offlineTurns === 1 ? "answer was" : "answers were"} written by the built-in template engine, not the AI model.` : "");
  return L.join("\n");
}

// ------------------------------------------------------------------ same question, other readers
export const BANDS = LEVELS;
export interface Reader { age: string; target: number | null; grade: number; words: number; actual: boolean; }
export interface Compare { readers: Reader[]; noMemory: { grade: number; words: number; level: string } | null; }
function compare(q: string, last: string | null, profile: Profile, actualLevel: string | undefined, hadMemory: boolean): Compare | null {
  if (!q.trim()) return null;
  try {
    const readers: Reader[] = BANDS.map(age => { const r = respond(q, { ...profile, age }, last, DEFAULT_MEMORY); const m = metrics(r.text); return { age, target: r.plan?.targetGrade ?? null, grade: m.grade, words: m.words, actual: age === actualLevel }; });
    let noMemory: Compare["noMemory"] = null;
    if (hadMemory) { const r = respond(q, profile, last, DEFAULT_MEMORY); const m = metrics(r.text); noMemory = { grade: m.grade, words: m.words, level: r.plan?.level ?? profile.age }; }
    return { readers, noMemory };
  } catch { return null; }
}

// ------------------------------------------------------------------ sentence-level readability
export interface Sent { text: string; grade: number; words: number; level: 0 | 1 | 2; }
export function heat(text: string, target: number | null): Sent[][] {
  const lines = text.replace(/\r/g, "").replace(/\s?\[\d{1,2}\]/g, "").split("\n").map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\*\*|__|`/g, "").replace(/(^|\s)[*_]([^*_\n]+)[*_]/g, "$1$2").trim()).filter(Boolean);
  return lines.map(line => (line.match(/[^.!?]+(?:[.!?]+["”’')\]]*)?\s*/g) ?? [line]).map(x => x.trim()).filter(Boolean).map(x => {
    const m = metrics(x); const level = target == null ? 0 : m.grade <= target + 1 ? 0 : m.grade <= target + 3 ? 1 : 2;
    return { text: x, grade: m.grade, words: m.words, level: level as 0 | 1 | 2 };
  }));
}

// ------------------------------------------------------------------ quality checks
export type CheckState = "yes" | "no" | "na" | "note";
export interface Check { id: string; label: string; state: CheckState; detail: string; }
export function checks(t: Turn): Check[] {
  const trace = t.reply.trace ?? []; const step = (n: string) => trace.find(s => s.name === n);
  const guard = step("OUTPUT_GUARD"); const val = step("VALIDATE"); const fired = trace.filter(s => s.status === "triggered" && !["OUTPUT_GUARD", "VALIDATE", "CITATION_CHECK", "REASSURANCE_CHECK"].includes(s.name)); const c = t.citations;
  return [
    { id: "level", label: "Reading level within 2 grades of target", state: t.within == null ? "na" : t.within ? "yes" : "no", detail: t.gap == null ? "Not measured (non-English or no target)" : `Grade ${t.grade} against target ${t.target}` },
    { id: "length", label: "Length within 10% of the word cap", state: t.words == null || t.maxWords == null ? "na" : t.words <= t.maxWords * 1.1 ? "yes" : "no", detail: t.words == null || t.maxWords == null ? "Not measured" : `${t.words} words, cap ${t.maxWords}` },
    { id: "cited", label: "Factual sentences cited to verified sources", state: !c || c.coverage == null ? "na" : c.invalid ? "no" : c.coverage >= 0.5 && !c.weak ? "yes" : "note", detail: !c || c.coverage == null ? (t.offline ? "Template answer: sources listed for the topic, not per sentence" : "No factual sentences found") : `${c.citedFactual}/${c.factual} cited, ${c.weak} weak match, ${c.invalid} invalid` },
    { id: "wording", label: "Avoided words the guidelines warn against", state: !t.reply.guidance ? "na" : t.reply.guidance.hits.length ? "no" : "yes", detail: !t.reply.guidance ? "Recorded before the guideline matrix was added" : t.reply.guidance.hits.length ? `Used ${t.reply.guidance.hits.map(h => `“${h.match}”`).join(", ")} (${[...new Set(t.reply.guidance.hits.map(h => h.id))].join(", ")})` : `Checked against ${t.reply.guidance.checked.length} guideline rows` },
    { id: "grounded", label: "Grounded in approved content", state: t.reply.topicId ? "yes" : "na", detail: t.reply.topicId ? `Coverage ${Math.round((t.reply.coverage ?? 0) * 100)}% of key concepts (heuristic)` : "No approved topic matched" },
    { id: "feeling", label: "A stated feeling was acknowledged", state: !t.psych?.expressed && !t.psych?.declined ? "na" : t.psych.acknowledged ? "yes" : "no", detail: t.psych?.expressed ? `${t.psych.type}: ${t.psych.strategy ?? "no strategy"}` : t.psych?.declined ? "Reader asked not to discuss feelings" : "No feeling stated" },
    { id: "safety", label: "No safety rule needed to fire", state: fired.length ? "note" : "yes", detail: fired.length ? `Fired: ${fired.map(s => s.name.replaceAll("_", " ").toLowerCase()).join(", ")}` : "Advice and crisis checks passed" },
    { id: "guard", label: "Model output passed the guard", state: !guard ? "na" : guard.status === "triggered" ? "note" : "yes", detail: !guard ? "No model output to check" : guard.status === "triggered" ? "The output guard added a care-team note" : "No dosing or prognosis language" },
    { id: "valid", label: "Passed the reading-level validator", state: !val ? "na" : val.status === "triggered" ? "no" : "yes", detail: val ? val.result : "No validation step recorded" },
    { id: "model", label: "Written by the AI model", state: t.offline ? "no" : "yes", detail: t.offline ? "Built-in template engine (model unavailable)" : String(t.reply.model) },
  ];
}

// ------------------------------------------------------------------ findings
export interface Insight { tone: "good" | "note" | "warn"; text: string; }
export function insights(d: ReportData): Insight[] {
  const out: Insight[] = []; const T = d.turns; if (!T.length) return out;
  const graded = T.filter(t => t.gap != null);
  if (graded.length) { const worst = graded.reduce((a, b) => (b.gap! > a.gap! ? b : a));
    out.push(d.within === d.graded ? { tone: "good", text: `Every measured answer landed inside the two-grade band. The widest gap was ${worst.gap!.toFixed(1)} grades on reply ${worst.n}.` }
      : { tone: "warn", text: `${d.graded - d.within} of ${d.graded} answers missed the target band. The widest miss was reply ${worst.n}: grade ${worst.grade} against a target of ${worst.target}.` }); }
  const i = T.findIndex((t, k) => k > 0 && t.signals.length > 0 && t.grade != null && T[k - 1].grade != null);
  if (i > 0) { const a = T[i - 1], b = T[i]; const dg = +(b.grade! - a.grade!).toFixed(1);
    out.push({ tone: "note", text: `After the reader ${b.signals.map(s => SIGNAL_LABEL[s].toLowerCase()).join(" and ")}, the next answer moved from grade ${a.grade} to ${b.grade} (${dg > 0 ? "+" : dg < 0 ? "−" : ""}${Math.abs(dg)}). This is an association within one conversation, not proof the change caused it.` }); }
  const persist = d.events.filter(e => e.scope === "persistent");
  if (persist.length) out.push({ tone: "note", text: `${persist.length} ${persist.length === 1 ? "change was" : "changes were"} saved as a lasting preference (${join(uniq(persist.map(e => PARAM[e.param].label.toLowerCase())))}). ${persist.some(e => e.trigger === "repeated_pattern") ? "Pattern-based ones are marked unconfirmed until the reader confirms them." : ""}`.trim() });
  const notSupported = d.events.filter(e => e.effect.startsWith("Not supported")); if (notSupported.length) out.push({ tone: "warn", text: `${notSupported.length} ${notSupported.length === 1 ? "adaptation was" : "adaptations were"} followed by the same request again, so ${notSupported.length === 1 ? "it does" : "they do"} not appear to have helped.` });
  if (d.checks.n) out.push({ tone: d.checks.correct === d.checks.n ? "good" : "note", text: `${d.checks.correct} of ${d.checks.n} comprehension checks were answered correctly right after the explanation. That shows immediate understanding, not long-term retention.` });
  if (d.citation.factual) out.push({ tone: d.citation.cited / d.citation.factual >= 0.6 && !d.citation.invalid ? "good" : "warn", text: `${d.citation.cited} of ${d.citation.factual} factual sentences carried a citation; ${d.citation.weak} citations matched their source only weakly${d.citation.invalid ? ` and ${d.citation.invalid} pointed at no source` : ""}.` });
  const unack = d.emotions.filter(e => e.acknowledged === false); if (unack.length) out.push({ tone: "warn", text: `${unack.length} stated ${unack.length === 1 ? "feeling was" : "feelings were"} not acknowledged by the heuristic check.` });
  const mem = T.find(t => t.compare?.noMemory && t.grade != null);
  if (mem) { const nm = mem.compare!.noMemory!; out.push({ tone: "note", text: `Memory changed reply ${mem.n}. Without it the built-in engine would have written at grade ${nm.grade} (ages ${nm.level}), against ${mem.grade} with it.` }); }
  if (d.offlineTurns) out.push({ tone: "warn", text: `${d.offlineTurns} of ${T.length} answers came from the template engine, so they say little about the AI model.` });
  const safe = d.safeguards.filter(x => !["VALIDATE", "OUTPUT_GUARD", "CITATION_CHECK", "REASSURANCE_CHECK"].includes(x.name)); const val = d.safeguards.filter(x => x.name === "VALIDATE");
  if (safe.length) out.push({ tone: "note", text: `${safe.length} safety ${safe.length === 1 ? "rule" : "rules"} fired: ${join(uniq(safe.map(s => s.name.replaceAll("_", " ").toLowerCase())))}.` });
  if (val.length) out.push({ tone: "warn", text: `The reading-level validator flagged ${val.length} ${val.length === 1 ? "answer" : "answers"} as off target${d.regenerated ? `, and ${d.regenerated} ${d.regenerated === 1 ? "was" : "were"} regenerated once` : ""}.` });
  if (T.length < 5) out.push({ tone: "note", text: `This is ${T.length === 1 ? "one answer" : `${T.length} answers`}. That describes a conversation, not how well the method works overall. Use the evaluation harness for that.` });
  return out;
}

// ------------------------------------------------------------------ across every saved conversation
export interface AllData {
  n: number; graded: number; within: number; meanGap: number | null; offline: number; first: string | null; last: string | null;
  byAge: { age: string; n: number; gap: number; within: number }[]; adapt: [string, number][]; signals: [string, number][]; modes: [string, number][]; models: [string, number][];
  rolling: { i: number; rate: number }[]; safety: number; feedback: Record<string, number>;
  events: number; reversals: number; emotions: [string, number][]; acknowledged: { n: number; yes: number }; cite: { n: number; mean: number | null }; checks: { n: number; correct: number }; latency: number | null; stages: [string, number][];
}
const tally = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
export function aggregateLog(log: LogEvent[]): AllData {
  const sorted = [...log].sort((a, b) => a.ts.localeCompare(b.ts)); const g = sorted.filter(e => e.grade != null && e.targetGrade != null && (e.lang ?? "en") === "en");
  const gap = (e: LogEvent) => Math.abs(e.grade! - e.targetGrade!); const win = 5;
  const feedback: Record<string, number> = {}; sorted.forEach(e => { if (e.feedback) feedback[e.feedback] = (feedback[e.feedback] ?? 0) + 1; });
  const emo = sorted.filter(e => e.emotion); const cites = sorted.filter(e => e.citeCoverage != null);
  return { n: sorted.length, graded: g.length, within: g.filter(e => gap(e) <= 2).length, meanGap: r1(mean(g.map(gap))), offline: sorted.filter(e => e.model === "onconnect-templates").length, first: sorted[0]?.ts ?? null, last: sorted.at(-1)?.ts ?? null,
    byAge: BANDS.map(age => { const x = g.filter(e => (e.level ?? e.age) === age); return { age, n: x.length, gap: r1(mean(x.map(gap))) ?? 0, within: x.filter(e => gap(e) <= 2).length }; }).filter(r => r.n > 0),
    adapt: tally(sorted.flatMap(e => e.adaptations ?? [])), signals: tally(sorted.flatMap(e => e.signals ?? [])), modes: tally(sorted.map(e => e.mode ?? "adaptive")), models: tally(sorted.map(e => e.model || "unknown")),
    rolling: g.map((_, i) => { const w = g.slice(Math.max(0, i - win + 1), i + 1); return { i: i + 1, rate: w.filter(e => gap(e) <= 2).length / w.length }; }),
    safety: sorted.filter(e => e.safety).length, feedback,
    events: sorted.reduce((s, e) => s + (e.events ?? 0), 0), reversals: sorted.reduce((s, e) => s + (e.reversals ?? 0), 0), emotions: tally(emo.map(e => e.emotion!)), acknowledged: { n: emo.filter(e => e.acknowledged != null).length, yes: emo.filter(e => e.acknowledged).length },
    cite: { n: cites.length, mean: r1(mean(cites.map(e => e.citeCoverage! * 100))) }, checks: { n: sorted.reduce((s, e) => s + (e.checks ?? 0), 0), correct: sorted.reduce((s, e) => s + (e.checksCorrect ?? 0), 0) },
    latency: r1(mean(sorted.filter(e => e.latency).map(e => e.latency! / 1000))), stages: tally(sorted.map(e => e.stage || "not set")) };
}
export const paramSeries = (turns: Turn[], id: ParamId) => turns.map(t => t.cfg[id]);

// ------------------------------------------------------------------ single-message report (spec 9.1)
/** One exchange, built by the same code as the session report so the two always agree. */
export function messageTurn(question: string, msg: Msg, profile: Profile): Turn | null {
  return buildReport([{ id: "q", role: "user", text: question }, msg], profile).turns[0] ?? null;
}

export type Support = "supported" | "weak" | "invalid";
export interface SentRow extends Sent { n: number; cites: { n: number | null; support: Support }[]; uncitedFact: boolean; }
const normS = (s: string) => s.replace(/\[\d{1,2}\]/g, "").replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\*\*|__|`/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
/** Each sentence of an answer with its reading grade, the sources it cites and whether the stored passage supports it. */
export function sentenceRows(r: Reply): SentRow[] {
  const target = (r.lang ?? "en") === "en" ? r.plan?.targetGrade ?? null : null; const c = r.citations; const ids = r.sources ?? [];
  const same = (a: string, b: string) => { const x = normS(a), y = normS(b); const k = Math.min(30, x.length, y.length); return k >= 8 && x.slice(0, k) === y.slice(0, k); };
  return heat(r.text, target).flat().map((s, i) => {
    const cites = (c?.checks ?? []).filter(k => same(k.sentence, s.text)).map(k => ({ n: k.support === "invalid" ? null : ids.indexOf(k.cites[0]) + 1 || null, support: k.support }));
    return { ...s, n: i + 1, cites, uncitedFact: !cites.length && (c?.uncited ?? []).some(u => same(u, s.text)) };
  });
}

/** Two to four plain sentences saying what happened to this message. */
export function messageSummary(t: Turn, profileAge: string): string {
  const r = t.reply; const out: string[] = []; const lvl = r.plan?.level ?? profileAge; const dash = (s: string) => s.replace("-", "–");
  out.push(`Written for ages ${dash(lvl)}${lvl !== profileAge ? `, adjusted from the ages ${dash(profileAge)} profile` : ""}${t.offline ? " by the built-in templates" : ""}.`);
  if (t.grade != null && t.target != null) out.push(t.within ? `Its reading grade (${t.grade}) is within two grades of the target (${t.target}).` : `Its reading grade (${t.grade}) missed the target (${t.target}) by ${t.gap!.toFixed(1)} grades.`);
  if (t.events.length) out.push(`${t.events.length === 1 ? "One setting" : `${t.events.length} settings`} changed in response to what the reader said${t.events.some(e => e.scope === "persistent") ? ", and at least one was saved as a preference" : ""}.`);
  if (r.revise) out.push(`The approach was revised: ${r.revise.replace(/\.$/, "")}.`);
  if (t.psych?.expressed) out.push(`The reader said they felt ${t.psych.type}; the answer ${t.psych.acknowledged ? "acknowledged it" : "may not have acknowledged it"}.`);
  const c = t.citations; if (c && c.coverage != null) out.push(`${c.citedFactual} of ${c.factual} factual sentences cite a checked source${c.weak ? `, ${c.weak} only weakly matched` : ""}${c.invalid ? `, ${c.invalid} invalid` : ""}.`);
  return out.join(" ");
}

/** The message report as Markdown, for a lab notebook or the appendix of a paper. */
export function messageMarkdown(t: Turn, profile: Profile, question: string): string {
  const r = t.reply; const L: string[] = [`# Message report ${r.id ?? ""}`.trim(), "", `> ${question || "(question not recorded)"}`, "", messageSummary(t, profile.age), ""];
  L.push("## Measurements", "", "| Measure | Value |", "|---|---|", `| Reading grade | ${t.grade ?? "n/a"} (target ${t.target ?? "n/a"}) |`, `| Words | ${t.words ?? "n/a"} (cap ${t.maxWords ?? "n/a"}) |`,
    `| Citations | ${t.citations?.coverage != null ? `${t.citations.citedFactual}/${t.citations.factual} factual sentences, ${t.citations.weak} weak, ${t.citations.invalid} invalid` : "topic-level"} |`, `| Model | ${r.model ?? "n/a"} |`, `| Latency | ${r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)} s` : "n/a"} |`, "");
  L.push("## Adaptation events", "", ...(t.events.length ? t.events.map(e => `- ${e.id}: ${eventLabel(e)} (${e.scope}; ${e.trigger.replaceAll("_", " ")}; ${e.rule}). Evidence: “${e.evidence}”`) : ["None."]), "");
  const ch = checks(t); L.push("## Checks", "", ...ch.map(c => `- [${c.state === "yes" ? "x" : " "}] ${c.label}: ${c.detail}`), "");
  L.push("## Sentences", "", "| # | Grade | Citations | Sentence |", "|---|---|---|---|", ...sentenceRows(r).map(s => `| ${s.n} | ${s.grade} | ${s.cites.map(c => `${c.n ? `[${c.n}]` : "invalid"} ${c.support}`).join(", ") || (s.uncitedFact ? "uncited fact" : "")} | ${s.text.replaceAll("|", "\\|")} |`), "");
  if (r.versions) L.push("## Versions", "", ...Object.entries(r.versions).map(([k, v]) => `- ${k}: ${v}`), "");
  L.push("_Readability is an automated proxy. Outcomes after this message are associations, not proof of effect._");
  return L.join("\n");
}
