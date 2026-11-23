import { GLOSSARY, SOURCE, TOPICS, type Level, type Topic } from "./content";

export interface Profile {
  role: "child" | "caregiver" | "together";
  age: Level;
  detail: "short" | "balanced" | "detailed";
  format: ("steps" | "examples" | "define" | "check")[];
  topics: string[];           // topic ids the user wants help with
  concerns: string[];
  updatedAt: string;
}
export const DEFAULT_PROFILE: Profile = { role: "child", age: "9-11", detail: "balanced", format: ["define", "examples"], topics: [], concerns: [], updatedAt: "" };

export interface Reply {
  text: string;
  topicId: string | null;
  used: string[];
  changed: string[];
  notDone: string[];
  adaptations: string[];
  safety: string | null;
  source: string | null;
  id?: string; ts?: string; model?: string; promptVersion?: string;
  metrics?: import("./metrics").Metrics; coverage?: number;
}

const ADVICE = /\b(should i|do i need|do i have to|dose|dosage|how much (medicine|medication)|will i (die|survive)|am i going to (die|be ok)|stop (taking|my)|is it safe for me|prognosis|survival rate)\b/i;
const DISTRESS = /\b(hurt myself|kill myself|want to die|don'?t want to live|suicid|self.?harm|scared of dying|i'?m (so )?scared|i can'?t do this)\b/i;
const SIMPLER = /\b(simpler|simple|too hard|confus|don'?t understand|easier)\b/i;
const DETAIL = /\b(more detail|detailed|more about|go deeper|technical)\b/i;

export function matchTopic(q: string): Topic | null {
  const s = q.toLowerCase();
  let best: Topic | null = null, score = 0;
  for (const t of TOPICS) for (const k of t.keywords) {
    const re = new RegExp(`\\b${k.replace(/ /g, "\\s+")}\\b`);
    if (re.test(s) && k.length > score) { best = t; score = k.length; }
  }
  return best;
}

export function respond(question: string, p: Profile, lastTopic: string | null): Reply {
  const base: Reply = { text: "", topicId: null, used: [], changed: [], notDone: [], adaptations: [], safety: null, source: null };
  base.notDone = ["Did not verify your personal diagnosis.", "Did not decide whether you need any procedure.", "Did not make treatment recommendations."];

  if (DISTRESS.test(question)) {
    return { ...base, safety: "SUPPORT_REDIRECT", adaptations: ["SAFETY_SUPPORT_REDIRECT"],
      text: "I'm really glad you told me. Feeling scared or overwhelmed is okay, and you don't have to handle it alone. Please tell a trusted adult, like a parent, nurse or doctor, right now. If you are in danger or thinking about hurting yourself, tell an adult immediately or call your local emergency number (in the US, call or text 988)." };
  }
  let topic = matchTopic(question);
  if (!topic && lastTopic && (SIMPLER.test(question) || DETAIL.test(question) || /again|more|why|what happens/i.test(question))) topic = TOPICS.find(t => t.id === lastTopic) ?? null;
  const advice = ADVICE.test(question);
  if (!topic) {
    return { ...base, safety: advice ? "INDIVIDUAL_ADVICE_REDIRECT" : null, adaptations: advice ? ["SAFETY_INDIVIDUAL_ADVICE_REDIRECT"] : [],
      text: (advice ? "That's an important question, and it's best answered by your own healthcare team because they know your situation. " : "") +
        "I can explain topics like: " + TOPICS.map(t => t.title).join(", ") + ". Which one would you like to learn about? You can also ask me what a medical word means." };
  }

  let level: Level = p.age;
  const order: Level[] = ["6-8", "9-11", "12-14", "15-17"];
  const idx = order.indexOf(level);
  let simplified = false, expanded = false;
  if (SIMPLER.test(question) && idx > 0) { level = order[idx - 1]; simplified = true; }
  else if (DETAIL.test(question) && idx < 3) { level = order[idx + 1]; expanded = true; }

  const adaptations: string[] = ["DEVELOPMENTAL_ADAPTATION"];
  const used = [`Your selected age range: ${p.age}.`, `Your selected topic: ${topic.title.toLowerCase()}.`];
  const changed = [`Used wording written for ages ${level}.`];
  if (simplified) { adaptations.push("SIMPLIFIED_ON_REQUEST"); changed.push("Made the explanation simpler because you asked."); used.push("Your request for a simpler explanation."); }
  if (expanded) { adaptations.push("EXPANDED_ON_REQUEST"); changed.push("Added more detail because you asked."); used.push("Your request for more detail."); }

  let text = topic.why[level];
  const steps = p.format.includes("steps") || p.detail === "detailed";
  if (steps && p.detail !== "short") {
    const n = level === "6-8" ? 3 : topic.steps.length;
    text += "\n\nWhat usually happens:\n" + topic.steps.slice(0, n).map((s, i) => `${i + 1}. ${s}`).join("\n");
    adaptations.push("STEPWISE_EXPLANATION"); changed.push(`Explained it in ${n} steps.`); used.push("Your preference for step-by-step explanations.");
  }
  if (p.format.includes("examples") && p.detail !== "detailed" || level === "6-8") {
    text += `\n\nThink of it this way: ${topic.example}`;
    adaptations.push("EXAMPLE_ADDED"); changed.push("Added a familiar comparison."); used.push("Your preference for examples.");
  }
  if (p.format.includes("define")) {
    const defs = topic.terms.slice(0, p.detail === "short" ? 2 : 4).map(id => `• ${id}: ${GLOSSARY[id]}`);
    text += "\n\nWords to know:\n" + defs.join("\n");
    adaptations.push("VOCABULARY_DEFINED"); changed.push("Defined medical words."); used.push("Your request for medical words to be explained.");
  }
  if (p.detail === "short" && !steps) { adaptations.push("SHORT_FORMAT"); changed.push("Kept it short."); used.push("Your preference for short explanations."); }
  if (advice) {
    text += "\n\nQuestions about what is right for you personally are best answered by your healthcare team, and I've added questions you could ask them in the Questions page.";
    adaptations.push("SAFETY_INDIVIDUAL_ADVICE_REDIRECT");
  }
  if (p.format.includes("check")) text += "\n\nDid that make sense? You can say \"simpler\" or \"more detail\".";
  text += "\n\nThis is general education, not advice about your own care.";
  return { ...base, text, topicId: topic.id, used, changed, adaptations, safety: advice ? "INDIVIDUAL_ADVICE_REDIRECT" : null, source: `${SOURCE.title} — ${topic.title} (${SOURCE.reviewed})` };
}
