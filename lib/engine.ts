import { GLOSSARY, SOURCE, TOPICS, type Level, type Topic } from "./content";
import { applySignals, detectSignals, DEFAULT_MEMORY, type Memory, type Signal } from "./memory";

export interface Profile {
  role: "child" | "caregiver" | "together";
  age: Level;
  detail: "short" | "balanced" | "detailed";
  format: ("steps" | "examples" | "define" | "check")[];
  topics: string[]; concerns: string[]; notes: string; updatedAt: string;
}
export const DEFAULT_PROFILE: Profile = { role: "child", age: "9-11", detail: "balanced", format: ["define", "examples"], topics: [], concerns: [], notes: "", updatedAt: "" };

export interface TraceStep { n: number; name: string; call: string; result: string; status: "ok" | "adapted" | "triggered" | "skipped"; }
export interface Plan { level: Level; effDetail: 0 | 1 | 2; steps: boolean; examples: boolean; define: boolean; alt: boolean; targetGrade: number; maxWords: number; }
export interface Reply {
  text: string; topicId: string | null; used: string[]; changed: string[]; notDone: string[]; adaptations: string[]; safety: string | null; source: string | null;
  id?: string; ts?: string; model?: string; promptVersion?: string; metrics?: import("./metrics").Metrics; coverage?: number;
  trace: TraceStep[]; memory: Memory; signals: Signal[]; plan?: Plan;
}

const ADVICE = /\b(should i|do i need|do i have to|dose|dosage|how much (medicine|medication)|will i (die|survive)|am i going to (die|be ok)|stop (taking|my)|is it safe for me|prognosis|survival rate)\b/i;
const DISTRESS = /\b(hurt myself|kill myself|want to die|don'?t want to live|suicid|self.?harm|scared of dying|i'?m (so )?scared|i can'?t do this)\b/i;
const ORDER: Level[] = ["6-8", "9-11", "12-14", "15-17"];
const BASE_GRADE = [3, 5.5, 8, 11];
const WORDS = [70, 140, 260];

export function matchTopic(q: string): { topic: Topic; keyword: string } | null {
  const s = q.toLowerCase(); let best: { topic: Topic; keyword: string } | null = null;
  for (const t of TOPICS) for (const k of t.keywords) {
    if (new RegExp(`\\b${k.replace(/ /g, "\\s+")}\\b`).test(s) && (!best || k.length > best.keyword.length)) best = { topic: t, keyword: k };
  }
  return best;
}
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function respond(question: string, p: Profile, lastTopic: string | null, memIn: Memory = DEFAULT_MEMORY): Reply {
  const trace: TraceStep[] = []; const add = (name: string, call: string, result: string, status: TraceStep["status"] = "ok") => trace.push({ n: trace.length + 1, name, call, result, status });
  const base = { used: [] as string[], changed: [] as string[], adaptations: [] as string[], safety: null as string | null, source: null as string | null, topicId: null as string | null };
  const notDone = ["Did not verify your personal diagnosis.", "Did not decide whether you need any procedure.", "Did not make treatment recommendations."];

  add("RECEIVE", `receive(question)`, `${question.length} chars, ${(question.match(/\S+/g) ?? []).length} words`);
  const distress = DISTRESS.test(question);
  add("SAFETY_SCAN", `match(DISTRESS_PATTERNS, question)`, distress ? "distress language detected, stop personalization and redirect" : "no distress language", distress ? "triggered" : "ok");
  if (distress) {
    add("REDIRECT", `respond(trusted_adult_message)`, "fixed safety message, model not called", "triggered");
    return { ...base, notDone, trace, memory: memIn, signals: [], safety: "SUPPORT_REDIRECT", adaptations: ["SAFETY_SUPPORT_REDIRECT"],
      text: "I'm really glad you told me. Feeling scared or overwhelmed is okay, and you don't have to handle it alone. Please tell a trusted adult, like a parent, nurse or doctor, right now. If you are in danger or thinking about hurting yourself, tell an adult immediately or call your local emergency number (in the US, call or text 988)." };
  }

  const m = matchTopic(question);
  let topic = m?.topic ?? null; let how = m ? `keyword "${m.keyword}" → ${m.topic.id}` : "no keyword matched";
  const follow = !topic && lastTopic && /again|more|why|what happens|simpl|detail|confus|understand|shorter|longer|example|step/i.test(question);
  if (follow) { topic = TOPICS.find(t => t.id === lastTopic) ?? null; how = `follow-up, carried over previous topic → ${lastTopic}`; }

  const signals = detectSignals(question);
  add("DETECT_SIGNALS", `detect(question, SIGNAL_PATTERNS)`, signals.length ? signals.join(", ") : "none", signals.length ? "adapted" : "ok");
  const { memory, changed } = applySignals(memIn, signals, topic?.id ?? null);
  add("UPDATE_MEMORY", `memory ← apply(signals, memory)`, changed.length ? changed.join("; ") : "no change", changed.length ? "adapted" : "ok");
  add("TOPIC_MATCH", `match_topic(question, last_topic=${lastTopic ?? "∅"})`, how, topic ? "ok" : "skipped");
  const advice = ADVICE.test(question);
  add("ADVICE_CHECK", `match(INDIVIDUAL_ADVICE, question)`, advice ? "personal medical question, add care-team redirect" : "general education", advice ? "triggered" : "ok");

  // Level + depth + strategy selection
  const ageIdx = ORDER.indexOf(p.age); const shift = Math.round(memory.levelShift);
  const lvlIdx = clamp(ageIdx + shift, 0, 3); const level = ORDER[lvlIdx];
  const detailIdx = ({ short: 0, balanced: 1, detailed: 2 } as const)[p.detail];
  const effDetail = clamp(detailIdx + Math.round(memory.lengthBias), 0, 2) as 0 | 1 | 2;
  const confRepeat = topic ? (memory.confusion[topic.id] ?? 0) >= 2 : false;
  const plan: Plan = {
    level, effDetail,
    steps: p.format.includes("steps") || memory.scaffold >= 1 || effDetail === 2 || memory.stepAffinity >= 2,
    examples: p.format.includes("examples") || memory.scaffold >= 1 || lvlIdx === 0 || memory.exampleAffinity >= 2 || confRepeat,
    define: p.format.includes("define") || memory.scaffold >= 2,
    alt: confRepeat,
    targetGrade: BASE_GRADE[lvlIdx], maxWords: WORDS[effDetail],
  };
  add("SELECT_LEVEL", `level = clamp(index(age=${p.age}) + round(level_shift=${memory.levelShift}), 0, 3)`, `${ageIdx} + ${shift} → ${lvlIdx} = ages ${level}`, shift ? "adapted" : "ok");
  add("SELECT_DEPTH", `depth = clamp(index(${p.detail}) + round(length_bias=${memory.lengthBias}), 0, 2)`, `${detailIdx} + ${Math.round(memory.lengthBias)} → ${effDetail} (${["short", "balanced", "detailed"][effDetail]}), cap ${plan.maxWords} words`, memory.lengthBias ? "adapted" : "ok");
  add("SELECT_STRATEGY", `strategy(scaffold=${memory.scaffold}, example_pref=${memory.exampleAffinity}, step_pref=${memory.stepAffinity}, repeat_confusion=${confRepeat})`,
    `steps=${plan.steps}, examples=${plan.examples}, define=${plan.define}${plan.alt ? ", ALTERNATE: analogy first" : ""}, target grade ≈ ${plan.targetGrade}`, plan.alt || memory.scaffold >= 1 ? "adapted" : "ok");

  if (!topic) {
    add("RETRIEVE", `retrieve(approved_content, topic=∅)`, "no approved content matched", "skipped");
    return { ...base, notDone, trace, memory, signals, plan, safety: advice ? "INDIVIDUAL_ADVICE_REDIRECT" : null, adaptations: advice ? ["SAFETY_INDIVIDUAL_ADVICE_REDIRECT"] : [],
      text: (advice ? "That's an important question, and it's best answered by your own healthcare team because they know your situation. " : "") + "I can explain topics like: " + TOPICS.map(t => t.title).join(", ") + ". Which one would you like to learn about? You can also ask me what a medical word means." };
  }
  add("RETRIEVE", `retrieve(approved_content, topic=${topic.id})`, `${topic.id}: ${Object.keys(topic.why).length} level texts, ${topic.steps.length} steps, ${topic.terms.length} terms`);

  const adaptations = ["DEVELOPMENTAL_ADAPTATION"];
  const used = [`Your selected age range: ${p.age}.`, `Your selected topic: ${topic.title.toLowerCase()}.`];
  const changedL = [`Used wording written for ages ${level}.`];
  if (shift) { changedL.push(`Shifted the level ${shift > 0 ? "up" : "down"} based on what you said earlier (memory).`); used.push(`Chat memory: level shift ${memory.levelShift}.`); adaptations.push(shift < 0 ? "MEMORY_SIMPLIFIED" : "MEMORY_EXPANDED"); }
  if (signals.includes("SIMPLER")) { adaptations.push("SIMPLIFIED_ON_REQUEST"); used.push("Your request for a simpler explanation."); }
  if (signals.includes("MORE_DETAIL")) { adaptations.push("EXPANDED_ON_REQUEST"); used.push("Your request for more detail."); }
  if (signals.includes("CONFUSED")) { adaptations.push("CONFUSION_SCAFFOLDING"); used.push("You said something was confusing."); }
  if (plan.alt) { adaptations.push("ALTERNATE_STRATEGY"); changedL.push("Tried a different explanation (analogy first) because earlier ones didn't land."); }
  if (memory.lengthBias) { used.push(`Chat memory: length bias ${memory.lengthBias}.`); }

  let text = topic.why[level];
  if (effDetail === 0 && memory.lengthBias <= -1) { text = text.split(/(?<=[.!?])\s/)[0]; adaptations.push("SHORT_FORMAT"); changedL.push("Cut the explanation down to its core sentence."); }
  const exampleLine = `Think of it this way: ${topic.example}`;
  if (plan.alt && plan.examples) text = `${exampleLine}\n\n${text}`;
  if (plan.steps && effDetail > 0) {
    const nSteps = lvlIdx === 0 ? 3 : topic.steps.length;
    text += "\n\nWhat usually happens:\n" + topic.steps.slice(0, nSteps).map((s, i) => `${i + 1}. ${s}`).join("\n");
    adaptations.push("STEPWISE_EXPLANATION"); changedL.push(`Explained it in ${nSteps} steps.`); used.push("Step-by-step preference or scaffolding.");
  }
  if (plan.examples && !plan.alt && (effDetail > 0 || memory.scaffold >= 1)) { text += `\n\n${exampleLine}`; adaptations.push("EXAMPLE_ADDED"); changedL.push("Added a familiar comparison."); used.push("Example preference or scaffolding."); }
  if (plan.define) {
    const n = effDetail === 0 ? 1 : effDetail === 1 ? 3 : 5;
    text += "\n\nWords to know:\n" + topic.terms.slice(0, n).map(id => `• ${id}: ${GLOSSARY[id]}`).join("\n");
    adaptations.push("VOCABULARY_DEFINED"); changedL.push("Defined medical words."); used.push("Your request for medical words to be explained.");
  }
  if (advice) { text += "\n\nQuestions about what is right for you personally are best answered by your healthcare team. The Questions page can help you write them down."; adaptations.push("SAFETY_INDIVIDUAL_ADVICE_REDIRECT"); }
  if (p.format.includes("check")) text += "\n\nDid that make sense? You can say \"simpler\", \"more detail\", \"shorter\" or \"I don't understand\".";
  text += "\n\nThis is general education, not advice about your own care.";
  return { ...base, text, topicId: topic.id, used, changed: changedL, notDone, adaptations, trace, memory, signals, plan, safety: advice ? "INDIVIDUAL_ADVICE_REDIRECT" : null, source: `${SOURCE.title}: ${topic.title} (${SOURCE.reviewed})` };
}
