// Builds the session report from a conversation. Pure functions: every number shown in the report comes from the saved replies, nothing is invented.
import type { Msg } from "./store";
import type { Profile, Reply } from "./engine";
import type { Signal, Snap } from "./memory";
import { GLOSSARY, TOPICS } from "./content";

export const SIGNAL_LABEL: Record<Signal, string> = { CONFUSED: "Said it was confusing", SIMPLER: "Asked for simpler", MORE_DETAIL: "Asked for more detail", SHORTER: "Asked for shorter", LONGER: "Asked for longer", UNDERSTOOD: "Said they understood", WANTS_EXAMPLE: "Wanted an example", WANTS_STEPS: "Wanted steps" };
export const ADAPT_LABEL: Record<string, string> = {
  DEVELOPMENTAL_ADAPTATION: "Adjusted complexity to the age profile", VOCABULARY_DEFINED: "Defined unfamiliar medical words", STEPWISE_EXPLANATION: "Used step-by-step explanations",
  EXAMPLE_ADDED: "Added familiar comparisons", SHORT_FORMAT: "Kept the explanation short", SIMPLIFIED_ON_REQUEST: "Simplified when asked", EXPANDED_ON_REQUEST: "Added detail when asked",
  MEMORY_SIMPLIFIED: "Used chat memory to lower the level", MEMORY_EXPANDED: "Used chat memory to raise the level", CONFUSION_SCAFFOLDING: "Added extra support after confusion", ALTERNATE_STRATEGY: "Switched to a different explanation approach",
  GENERAL_KNOWLEDGE_ANSWER: "Answered from general knowledge (no approved content matched)", SAFETY_INDIVIDUAL_ADVICE_REDIRECT: "Pointed a personal medical question to the care team", SAFETY_SUPPORT_REDIRECT: "Encouraged talking to a trusted adult",
};
export const adaptLabel = (a: string) => ADAPT_LABEL[a] ?? a.toLowerCase().replaceAll("_", " ");

export interface Turn {
  n: number; id: string; question: string; reply: Reply;
  grade: number | null; target: number | null; gap: number | null; within: boolean | null; words: number | null; maxWords: number | null;
  signals: Signal[]; mem: Snap; delta: Snap; offline: boolean; feedback?: Msg["feedback"];
}
export interface Safeguard { turn: number; name: string; result: string; }
export interface ReportData {
  turns: Turn[]; asked: number; topics: { id: string; title: string }[]; terms: string[]; glossary: [string, string][]; sources: string[]; adaptations: string[];
  graded: number; within: number; meanGap: number | null; meanWords: number | null; start: Snap; end: Snap; models: string[]; offlineTurns: number; regenerated: number;
  safeguards: Safeguard[]; feedback: Record<string, number>; headline: string; profile: Profile;
}

const snap = (m?: Snap): Snap => ({ levelShift: m?.levelShift ?? 0, lengthBias: m?.lengthBias ?? 0, scaffold: m?.scaffold ?? 0 });
const diff = (a: Snap, b: Snap): Snap => ({ levelShift: a.levelShift - b.levelShift, lengthBias: a.lengthBias - b.lengthBias, scaffold: a.scaffold - b.scaffold });
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const join = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.length === 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export function buildReport(msgs: Msg[], profile: Profile): ReportData {
  const turns: Turn[] = []; let lastUser = ""; let prev: Snap | null = null;
  for (const m of msgs) {
    if (m.role === "user") { lastUser = m.text; continue; }
    const r = m.reply; if (!r) continue;
    const mem = snap(r.memory); const english = (r.lang ?? "en") === "en";
    const grade = english && r.metrics ? r.metrics.grade : null; const target = r.plan?.targetGrade ?? null;
    const gap = grade != null && target != null ? Math.abs(grade - target) : null;
    const before = prev ?? snap(r.memory?.events?.at(-1)?.before);
    turns.push({ n: turns.length + 1, id: m.id, question: lastUser, reply: r, grade, target, gap, within: gap == null ? null : gap <= 2, words: r.metrics?.words ?? null, maxWords: r.plan?.maxWords ?? null,
      signals: r.signals ?? [], mem, delta: diff(mem, before), offline: (r.model ?? "onconnect-templates") === "onconnect-templates", feedback: m.feedback });
    prev = mem;
  }
  const graded = turns.filter(t => t.gap != null); const within = graded.filter(t => t.within).length;
  const topics = uniq(turns.map(t => t.reply.topicId).filter(Boolean) as string[]).map(id => ({ id, title: TOPICS.find(t => t.id === id)?.title ?? id }));
  const terms = uniq(topics.flatMap(t => TOPICS.find(x => x.id === t.id)?.terms ?? []));
  const safeguards: Safeguard[] = turns.flatMap(t => (t.reply.trace ?? []).filter(s => s.status === "triggered").map(s => ({ turn: t.n, name: s.name, result: s.result })));
  const regenerated = turns.filter(t => (t.reply.trace ?? []).some(s => /regenerat/i.test(s.result))).length;
  const feedback: Record<string, number> = {}; turns.forEach(t => { if (t.feedback) feedback[t.feedback] = (feedback[t.feedback] ?? 0) + 1; });
  const start = turns[0] ? diff(turns[0].mem, turns[0].delta) : snap(); const end = turns.at(-1)?.mem ?? snap();
  const meanGap = r1(mean(graded.map(t => t.gap!))); const meanWords = r1(mean(turns.map(t => t.words).filter((x): x is number => x != null)));

  // plain-language headline, assembled only from measured facts
  const parts: string[] = [];
  parts.push(`${turns.length} ${turns.length === 1 ? "answer" : "answers"} on ${topics.length ? join(topics.map(t => t.title.toLowerCase())) : "general questions"}.`);
  if (graded.length) parts.push(`${within} of ${graded.length} landed within two grades of the target reading level${meanGap != null ? ` (average gap ${meanGap} grades)` : ""}.`);
  const sig = turns.flatMap(t => t.signals);
  if (sig.length) parts.push(end.levelShift !== start.levelShift ? `After ${join(uniq(sig).map(s => SIGNAL_LABEL[s].toLowerCase()))}, the reading level shifted from ${fmt(start.levelShift)} to ${fmt(end.levelShift)}.` : `Signals detected: ${join(uniq(sig).map(s => SIGNAL_LABEL[s].toLowerCase()))}.`);
  else parts.push("No feedback signals were detected, so the level stayed at the profile's starting point.");
  if (safeguards.length) parts.push(`${safeguards.length} safety ${safeguards.length === 1 ? "rule" : "rules"} fired.`);

  return { turns, asked: msgs.filter(m => m.role === "user").length, topics, terms, glossary: terms.filter(t => GLOSSARY[t]).map(t => [t, GLOSSARY[t]] as [string, string]),
    sources: uniq(turns.map(t => t.reply.source).filter(Boolean) as string[]), adaptations: uniq(turns.flatMap(t => t.reply.adaptations)), graded: graded.length, within, meanGap, meanWords, start, end,
    models: uniq(turns.map(t => t.reply.model ?? "onconnect-templates")), offlineTurns: turns.filter(t => t.offline).length, regenerated, safeguards, feedback, headline: parts.join(" "), profile };
}

export const fmt = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

export function reportMarkdown(d: ReportData, title: string): string {
  const L: string[] = [`# Onconnect session report`, `_${title} · generated ${new Date().toLocaleString()} · ages ${d.profile.age}, ${d.profile.detail} detail_`, "", d.headline, "",
    "## Measurements", "", "| Reply | Topic | Target grade | Measured grade | Words | Signals | Level shift | Model |", "|---|---|---|---|---|---|---|---|"];
  d.turns.forEach(t => L.push(`| ${t.n} | ${t.reply.topicId ?? "general"} | ${t.target ?? "n/a"} | ${t.grade ?? "n/a"} | ${t.words ?? "n/a"}${t.maxWords ? ` / ${t.maxWords}` : ""} | ${t.signals.map(s => SIGNAL_LABEL[s]).join("; ") || "none"} | ${fmt(t.mem.levelShift)} | ${t.reply.model ?? "templates"} |`));
  L.push("", "## What changed and why", "");
  d.turns.forEach(t => { L.push(`**${t.n}. ${t.question || "(no question)"}**`, ...t.reply.adaptations.map(a => `- ${adaptLabel(a)}`), ""); });
  if (d.safeguards.length) { L.push("## Safeguards that fired", "", ...d.safeguards.map(s => `- Reply ${s.turn}, ${s.name}: ${s.result}`), ""); }
  L.push("## Method and limits", "", "- Reading grade is the Flesch–Kincaid formula (English only); coverage is a keyword heuristic. Neither is a clinical measure.", "- Memory updates come from keyword rules, not a validated psychological model.",
    "- Understanding was not assessed. This is general education, not advice about anyone's own care.", d.offlineTurns ? `- ${d.offlineTurns} ${d.offlineTurns === 1 ? "answer was" : "answers were"} written by the built-in template engine, not the AI model.` : "");
  return L.join("\n");
}
