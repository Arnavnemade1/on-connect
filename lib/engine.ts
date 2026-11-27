// Central adaptive orchestration engine (spec 2.1). One engine coordinates the components and records each step.
// This file builds the plan and the approved-content (template) answer. The pipeline adds model generation,
// citation checks, the output guard and validation on top.
import { GLOSSARY, LEVELS, TOPICS, type Level, type Topic } from "./content";
import { QUIZ, type Q } from "./more";
import { adapt, DEFAULT_MEMORY, detectSignals, detectStatements, relevantRecords, eventLabel, type AdaptEvent, type MemOp, type Memory, type Signal } from "./memory";
import { initialConfig, label, type Config } from "./params";
import { readEmotion, strategyFor, type EmotionRead, type Strategy } from "./psych";
import { retrieve, type Source } from "./sources";

export type Role = "child" | "caregiver" | "together";
export type CareStage = "" | "newly_diagnosed" | "testing" | "imaging" | "pre_procedure" | "procedure" | "post_procedure" | "treatment" | "hospital" | "follow_up";
export const CARE_STAGES: [CareStage, string][] = [["newly_diagnosed", "Newly diagnosed"], ["testing", "Diagnostic testing"], ["imaging", "Imaging"], ["pre_procedure", "Before a procedure"], ["procedure", "Procedure"], ["post_procedure", "After a procedure"], ["treatment", "Treatment"], ["hospital", "In hospital"], ["follow_up", "Follow-up and survivorship"]];
export interface Profile {
  role: Role; age: Level; detail: "short" | "balanced" | "detailed"; format: ("steps" | "examples" | "define" | "check")[];
  topics: string[]; concerns: string[]; notes: string; updatedAt: string; lang?: string;
  name?: string; stage?: CareStage; procedures?: string[]; diagnosis?: string; accessibility?: string; caregiver?: "yes" | "sometimes" | "no" | "";
}
export const DEFAULT_PROFILE: Profile = { role: "child", age: "9-12", detail: "balanced", format: ["define", "examples"], topics: [], concerns: [], notes: "", updatedAt: "", lang: "en", name: "", stage: "", procedures: [], diagnosis: "", accessibility: "", caregiver: "" };

export interface TraceStep { n: number; name: string; component?: string; call: string; result: string; status: "ok" | "adapted" | "triggered" | "skipped"; }
export interface Plan { level: Level; effDetail: 0 | 1 | 2; steps: boolean; examples: boolean; define: boolean; alt: boolean; targetGrade: number; maxWords: number; nTerms: number; visual: boolean; pacing: "slower" | "standard"; concepts: 0 | 1 | 2; terminology: 0 | 1 | 2; }
export interface Psych { expressed: boolean; type: string | null; strategy: string | null; acknowledged: boolean | null; humanSupport: boolean; resourceOffered: boolean; followUpAsked: boolean; escalation: boolean; declined: boolean; }
export interface Reply {
  text: string; topicId: string | null; used: string[]; changed: string[]; notDone: string[]; adaptations: string[]; safety: string | null; source: string | null;
  id?: string; ts?: string; model?: string; promptVersion?: string; metrics?: import("./metrics").Metrics; coverage?: number;
  trace: TraceStep[]; memory: Memory; signals: Signal[]; plan?: Plan; lang?: string; mode?: "adaptive" | "baseline" | "age"; stopped?: boolean;
  // v0.6
  config?: Config; configBefore?: Config; events?: AdaptEvent[]; ops?: MemOp[]; psych?: Psych; revise?: string | null; sources?: string[]; citations?: import("./sources").CitationReport;
  teachback?: { topic: string; q: Q; index: number } | null; versions?: Record<string, string>; conv?: string | null; latencyMs?: number; resources?: { id: string; name: string; category: string; url: string }[];
  guidance?: { applied: string[]; checked: string[]; hits: import("./guidelines").WordingHit[]; version: string };
}

const ADVICE = /\b(should i|do i need|do i have to|dose|dosage|how much (medicine|medication)|will i (die|survive)|am i going to (die|be ok)|stop (taking|my)|is it safe for me|prognosis|survival rate)\b/i;
export const BASE_GRADE = [1.5, 3, 5.5, 8, 11];                  // Flesch–Kincaid targets per profile (engineering settings; FK is not meaningful for read-aloud at 3–5)
export const WORDS = [70, 140, 260];                              // kept for older callers
const CAPS = [[40, 70, 110], [60, 110, 180], [70, 140, 260], [90, 170, 300], [100, 200, 340]];
export const capFor = (level: number, length: number) => CAPS[Math.max(0, Math.min(4, level))][Math.max(0, Math.min(2, length))];

export function matchTopic(q: string): { topic: Topic; keyword: string } | null {
  const s = q.toLowerCase(); let best: { topic: Topic; keyword: string } | null = null;
  for (const t of TOPICS) for (const k of t.keywords) if (new RegExp(`\\b${k.replace(/ /g, "\\s+")}\\b`).test(s) && (!best || k.length > best.keyword.length)) best = { topic: t, keyword: k };
  return best;
}

/** Plan derived from the effective configuration. Each field is traceable to a named parameter. */
export function planFrom(c: Config, revise: boolean): Plan {
  const level = LEVELS[c.reading_level]; const depth = c.explanation_depth as 0 | 1 | 2;
  return {
    level, effDetail: depth, targetGrade: BASE_GRADE[c.reading_level], maxWords: capFor(c.reading_level, c.response_length),
    steps: c.structure === 1, examples: c.analogy_usage >= 2 || revise, define: c.definition_frequency >= 1 && c.terminology_density <= 1 || c.definition_frequency === 2,
    alt: revise, nTerms: [1, 3, 5][c.definition_frequency], visual: c.visual_support === 1, pacing: c.information_pacing === 0 ? "slower" : "standard",
    concepts: c.concept_density as 0 | 1 | 2, terminology: c.terminology_density as 0 | 1 | 2,
  };
}

const ACK: Record<string, string> = {
  fear: "It makes sense to feel worried about this.", sadness: "I'm sorry you're feeling sad. You can decide whether we keep going.", frustration: "That sounds frustrating. Let's try it a different way.",
  embarrassment: "That's a really good question, and lots of kids wonder the same thing.", uncertainty: "Not knowing what will happen can be hard. Here is what usually happens.", RESPECT_BOUNDARY: "Okay, we don't have to talk about that.",
};

export interface RespondOpts { conv?: string | null; ts?: string; previousChecks?: Record<string, number>; }
export function respond(question: string, p: Profile, lastTopic: string | null, memIn: Memory = DEFAULT_MEMORY, opts: RespondOpts = {}): Reply {
  const trace: TraceStep[] = []; const add = (name: string, component: string, call: string, result: string, status: TraceStep["status"] = "ok") => trace.push({ n: trace.length + 1, name, component, call, result, status });
  const base = { used: [] as string[], changed: [] as string[], adaptations: [] as string[], safety: null as string | null, source: null as string | null, topicId: null as string | null };
  const notDone = ["Did not verify your personal diagnosis.", "Did not decide whether you need any procedure.", "Did not make treatment recommendations.", "Did not diagnose any feeling or psychological condition."];
  const conv = opts.conv ?? null; const initial = initialConfig(p);

  add("RECEIVE", "Central engine", "receive(question)", `${question.length} chars, ${(question.match(/\S+/g) ?? []).length} words`);
  const emo: EmotionRead = readEmotion(question);
  add("SAFETY_SCAN", "Medical Safety and Verification Engine", "match(CRISIS_PATTERNS, question)", emo.crisis ? "crisis language detected: stop personalization, give the trusted-adult and 988 message" : "no crisis language", emo.crisis ? "triggered" : "ok");
  if (emo.crisis) {
    add("ESCALATE", "Psychological Communication Engine", "respond(trusted_adult_and_crisis_line)", "fixed safety message, model not called", "triggered");
    return { ...base, notDone, trace, memory: memIn, signals: [], safety: "SUPPORT_REDIRECT", adaptations: ["SAFETY_SUPPORT_REDIRECT"], conv, config: initial, configBefore: initial, events: [], ops: [], revise: null, sources: [], teachback: null,
      psych: { expressed: true, type: "crisis", strategy: "ESCALATE_TRUSTED_ADULT", acknowledged: true, humanSupport: true, resourceOffered: true, followUpAsked: false, escalation: true, declined: false },
      text: "I'm really glad you told me. Feeling scared or overwhelmed is okay, and you don't have to handle it alone. Please tell a trusted adult, like a parent, nurse or doctor, right now. If you are in danger or thinking about hurting yourself, tell an adult immediately or call your local emergency number (in the US, call or text 988)." };
  }

  // Medical Context Engine: topic, with follow-ups carried over
  const m = matchTopic(question);
  let topic = m?.topic ?? null; let how = m ? `keyword "${m.keyword}" → ${m.topic.id}` : "no keyword matched";
  if (!topic && lastTopic && /again|more|why|what happens|simpl|detail|confus|understand|get it|shorter|longer|example|step|picture|scared|worried|that/i.test(question)) { topic = TOPICS.find(t => t.id === lastTopic) ?? null; how = `follow-up, carried over previous topic → ${lastTopic}`; }

  const signals = detectSignals(question); const statements = detectStatements(question);
  add("READ_EMOTION", "Psychological Communication Engine", "read(stated emotion only)", emo.declines ? "asked not to talk about feelings" : emo.expressed ? `${emo.type} (stated: “${emo.quote}”)` : "no emotion stated", emo.expressed || emo.declines ? "adapted" : "ok");
  add("DETECT_SIGNALS", "Comprehension and Learning Engine", "detect(question, SIGNAL_PATTERNS)", signals.length ? signals.join(", ") : "none", signals.length ? "adapted" : "ok");
  add("DETECT_STATEMENTS", "Patient Context Manager", "detect(question, STATEMENT_PATTERNS)", statements.length ? statements.map(s => s.kind.toLowerCase()).join(", ") : "none", statements.length ? "adapted" : "ok");

  const a = adapt(memIn, { question, signals, statements, emotion: emo, topic: topic?.id ?? null, topicTitle: topic?.title, conv, initial, profileUpdated: p.updatedAt, ts: opts.ts });
  const memory = a.memory; const cfg = a.after;
  add("UPDATE_MEMORY", "Memory Management Engine", "memory ← policy(signals, statements, emotion)", a.ops.filter(o => o.op !== "confirmed").length ? a.ops.filter(o => o.op !== "confirmed").map(o => `${o.op} ${o.id}`).join("; ") : "no memory change", a.ops.some(o => o.op !== "confirmed") ? "adapted" : "ok");
  add("SELECT_CONFIG", "Adaptation parameter registry", `effective(initial(profile), persistent, session=${conv ?? "∅"})`, a.events.length ? a.events.map(e => `${e.id} ${eventLabel(e)} (${e.scope})`).join("; ") : "no parameter change", a.events.length ? "adapted" : "ok");
  add("TOPIC_MATCH", "Medical Context Engine", `match_topic(question, last_topic=${lastTopic ?? "∅"})`, how, topic ? "ok" : "skipped");
  const advice = ADVICE.test(question);
  add("ADVICE_CHECK", "Medical Safety and Verification Engine", "match(INDIVIDUAL_ADVICE, question)", advice ? "personal medical question, add care-team redirect" : "general education", advice ? "triggered" : "ok");
  add("REVISION_CHECK", "Response Revision Engine", `revise?(confusion=${topic ? memory.confusion[topic.id] ?? 0 : 0}, failed_checks=${topic ? memory.failedChecks[topic.id] ?? 0 : 0})`, a.revise ?? "keep current approach", a.revise ? "adapted" : "ok");

  const plan = planFrom(cfg, !!a.revise);
  const strategy: Strategy | null = strategyFor(emo, cfg.emotional_followup === 1, cfg.reading_level <= 1);
  add("SELECT_STRATEGY", "Developmental and Linguistic Adaptation Engines", `plan(config)`, `${label("reading_level", cfg.reading_level)}, depth ${label("explanation_depth", cfg.explanation_depth).toLowerCase()}, ≤${plan.maxWords} words, target grade ≈ ${plan.targetGrade}${plan.steps ? ", steps" : ""}${plan.examples ? ", analogy" : ""}${plan.define ? `, define ${plan.nTerms} terms` : ""}${plan.visual ? ", visual support" : ""}${strategy ? `, ${strategy.id}` : ""}`, plan.alt || strategy ? "adapted" : "ok");

  const sources: Source[] = retrieve(topic?.id ?? null, question, emo.expressed);
  const psych: Psych = { expressed: emo.expressed, type: emo.type, strategy: strategy?.id ?? null, acknowledged: null, humanSupport: !!strategy?.humanSupport, resourceOffered: !!strategy?.offerResource, followUpAsked: false, escalation: false, declined: emo.declines };
  const common = { notDone, trace, memory, signals, plan, conv, config: cfg, configBefore: a.before, events: a.events, ops: [...relevantRecords(memory, topic?.id ?? null).map(r => ({ op: "accessed" as const, id: r.id, content: r.content, reason: "used to shape this answer" })), ...a.ops], revise: a.revise, psych, sources: sources.map(s => s.id) };

  if (!topic) {
    add("RETRIEVE", "Educational Knowledge Retrieval Engine", "retrieve(approved_sources, topic=∅)", sources.length ? `${sources.length} coping sources` : "no approved source matched", sources.length ? "ok" : "skipped");
    const ack = strategy && ACK[strategy.id === "RESPECT_BOUNDARY" ? "RESPECT_BOUNDARY" : emo.type ?? ""] ? `${ACK[strategy.id === "RESPECT_BOUNDARY" ? "RESPECT_BOUNDARY" : emo.type!]} ` : "";
    if (ack) psych.acknowledged = true;
    return { ...base, ...common, safety: advice ? "INDIVIDUAL_ADVICE_REDIRECT" : null, adaptations: advice ? ["SAFETY_INDIVIDUAL_ADVICE_REDIRECT"] : strategy ? [`PSYCH_${strategy.id}`] : [], teachback: null,
      text: ack + (advice ? "That's an important question, and it's best answered by your own healthcare team because they know your situation. " : "") + "I can explain topics like: " + TOPICS.map(t => t.title).join(", ") + ". Which one would you like to learn about? You can also ask me what a medical word means." + (psych.humanSupport ? "\n\nA trusted adult or your care team can help with this too." : "") };
  }
  add("RETRIEVE", "Educational Knowledge Retrieval Engine", `retrieve(approved_content + verified_sources, topic=${topic.id})`, `${topic.id}: ${Object.keys(topic.why).length} profile texts, ${topic.steps.length} steps; sources ${sources.map(s => s.id).join(", ") || "none"}`);

  // Template answer from approved content, shaped by the plan
  const adaptations = ["DEVELOPMENTAL_ADAPTATION"]; const used = [`Your age range: ${p.age}.`, `Topic: ${topic.title.toLowerCase()}.`]; const changedL = [`Used wording written for ages ${plan.level}.`];
  if (plan.level !== p.age) { changedL.push(`Adjusted the reading level to ages ${plan.level} for this answer, based on what you said.`); adaptations.push(LEVELS.indexOf(plan.level) < LEVELS.indexOf(p.age) ? "MEMORY_SIMPLIFIED" : "MEMORY_EXPANDED"); }
  if (signals.includes("SIMPLER")) { adaptations.push("SIMPLIFIED_ON_REQUEST"); used.push("Your request for a simpler explanation."); }
  if (signals.includes("MORE_DETAIL")) { adaptations.push("EXPANDED_ON_REQUEST"); used.push("Your request for more detail."); }
  if (signals.includes("CONFUSED")) { adaptations.push("CONFUSION_SCAFFOLDING"); used.push("You said something was confusing."); }
  if (plan.alt) { adaptations.push("ALTERNATE_STRATEGY"); changedL.push(`Changed approach: ${a.revise}.`); }
  if (strategy) { adaptations.push(`PSYCH_${strategy.id}`); used.push("What you said about how you feel (this conversation only)."); }
  for (const r of common.ops.filter(o => o.op === "accessed")) used.push(`Memory ${r.id}: ${r.content}.`);

  // Assemble the answer from sections, then drop optional ones (lowest priority first) until it fits the word cap.
  const core: string[] = []; const extra: { key: string; text: string; tag: string; note: string; prio: number }[] = [];
  let lead = topic.why[plan.level];
  if (plan.concepts === 0 || cfg.response_length === 0) { const first = lead.split(/(?<=[.!?])\s/); lead = first.slice(0, plan.concepts === 0 ? 2 : 1).join(" "); if (cfg.response_length === 0) { adaptations.push("SHORT_FORMAT"); changedL.push("Kept it to the core idea."); } }
  const exampleLine = `Think of it this way: ${topic.example}`;
  if (plan.alt) core.push(exampleLine); core.push(lead);
  const stepCap = plan.pacing === "slower" || plan.concepts === 0 ? 3 : topic.steps.length;
  if (plan.steps || (plan.effDetail === 2 && cfg.response_length > 0)) extra.push({ key: "steps", prio: 4, tag: "STEPWISE_EXPLANATION", note: `Explained it in ${Math.min(stepCap, topic.steps.length)} steps.`, text: "What usually happens:\n" + topic.steps.slice(0, stepCap).map((s, i) => `${i + 1}. ${s}`).join("\n") });
  if (plan.examples && !plan.alt && cfg.response_length > 0) extra.push({ key: "example", prio: 3, tag: "EXAMPLE_ADDED", note: "Added a familiar comparison.", text: exampleLine });
  if (plan.define && cfg.response_length > 0) extra.push({ key: "define", prio: 2, tag: "VOCABULARY_DEFINED", note: "Defined medical words.", text: "Words to know:\n" + topic.terms.slice(0, plan.nTerms).map(t => `• ${t}: ${GLOSSARY[t]}`).join("\n") });
  if (plan.visual) extra.push({ key: "visual", prio: 1, tag: "VISUAL_SUPPORT", note: "Pointed to a picture-based explanation.", text: "You can see where this happens on the body map in the Anatomy section." });
  const words = (t: string) => (t.match(/[A-Za-z']+/g) ?? []).length; const fixed = words(core.join(" ")) + 12;
  const kept = [...extra]; let dropped = 0;
  while (kept.length && fixed + kept.reduce((n, e) => n + words(e.text), 0) > plan.maxWords * 1.1) { const low = kept.reduce((a, e) => (e.prio < a.prio ? e : a)); kept.splice(kept.indexOf(low), 1); dropped++; }
  if (dropped) changedL.push(`Left out ${dropped} optional section${dropped > 1 ? "s" : ""} to stay within ${plan.maxWords} words.`);
  for (const e of kept) { adaptations.push(e.tag); changedL.push(e.note); }
  let text = [...core, ...extra.filter(e => kept.includes(e)).map(e => e.text)].join("\n\n");
  if (plan.pacing === "slower" && topic.steps.length > stepCap) text += "\n\nWant to hear the next part?";
  if (strategy) { const k = strategy.id === "RESPECT_BOUNDARY" ? "RESPECT_BOUNDARY" : emo.type ?? ""; if (ACK[k]) { text = `${ACK[k]}\n\n${text}`; psych.acknowledged = true; } if (strategy.humanSupport) text += "\n\nA trusted adult or your care team can help with this too."; }
  if (advice) { text += "\n\nQuestions about what is right for you personally are best answered by your healthcare team. The Questions page can help you write them down."; adaptations.push("SAFETY_INDIVIDUAL_ADVICE_REDIRECT"); }
  text += "\n\nThis is general education, not advice about your own care.";

  // Comprehension and Learning Engine: offer a teach-back question when the setting calls for it
  const quiz = QUIZ[topic.id] ?? []; const demonstrated = memory.records.some(r => r.key === `edu:demonstrated:${topic!.id}` && r.status === "active");
  const want = cfg.teachback_frequency === 2 || (cfg.teachback_frequency === 1 && !demonstrated && !signals.includes("UNDERSTOOD"));
  const idx = quiz.length ? (memory.failedChecks[topic.id] ?? 0) % quiz.length : -1;
  const teachback = want && idx >= 0 && !strategy?.id.startsWith("SADNESS") ? { topic: topic.id, q: quiz[idx], index: idx } : null;
  add("COMPREHENSION_CHECK", "Comprehension and Learning Engine", `teach_back?(frequency=${label("teachback_frequency", cfg.teachback_frequency)}, demonstrated=${demonstrated})`, teachback ? `offer: “${teachback.q.q}”` : "not offered", teachback ? "adapted" : "ok");

  return { ...base, ...common, text, topicId: topic.id, used, changed: changedL, adaptations, safety: advice ? "INDIVIDUAL_ADVICE_REDIRECT" : null, source: `Onconnect approved content (draft, pending clinician review): ${topic.title}`, teachback };
}
