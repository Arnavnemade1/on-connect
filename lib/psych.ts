// Psychological Communication Engine (spec Part V, 22.3).
// Responds only to emotions the reader states. It never infers or labels a psychological condition.
export type Emotion = "fear" | "confusion" | "frustration" | "sadness" | "curiosity" | "embarrassment" | "uncertainty";
export interface EmotionRead { expressed: boolean; type: Emotion | null; declines: boolean; crisis: boolean; quote: string | null; }

const PATTERNS: [Emotion, RegExp][] = [
  ["fear", /\b(i'?m|i am|i feel|feeling|im)\s+(really |so |a (little|bit) |kind of |kinda )?(scared|afraid|frightened|terrified|nervous|worried|anxious)\b|\bscares me\b|\b(i'?m|i am) (worried|nervous) (about|that)\b/i],
  ["sadness", /\b(i'?m|i am|i feel|feeling|im)\s+(really |so |a bit |kind of )?(sad|upset|down|lonely|unhappy)\b|\bmakes me (sad|cry)\b|\bi (want to|wanna) cry\b/i],
  ["frustration", /\b(i'?m|i am|i feel|im)\s+(so |really )?(frustrated|annoyed|fed up|sick of (this|it))\b|\bthis is (so )?(annoying|frustrating)\b|\bugh\b/i],
  ["embarrassment", /\b(i'?m|i am|i feel|im)\s+(so |really )?(embarrassed|ashamed)\b|\b(embarrassing|awkward) to ask\b/i],
  ["uncertainty", /\b(i'?m|i am|im) not sure (what|if|whether|how)\b|\bi don'?t know what (will|is going to) happen\b|\bwhat if\b/i],
  ["curiosity", /\b(i'?m|i am) (curious|interested)\b|\bi want to (know|learn) (more|everything|exactly)\b|\bhow does (it|that) (actually )?work\b/i],
  ["confusion", /\b(i'?m|i am|im) (so |really )?(confused|lost)\b/i],
];
const DECLINES = /\b(i )?(don'?t|do not|dont) want to talk about (it|this|that|being scared|my feelings|feelings|how i feel)( right now)?\b|\bcan we (not talk|stop talking) about (it|feelings|this)\b/i;
const CRISIS = /\b(hurt myself|kill myself|want to die|don'?t want to live|suicid|self.?harm)\b/i;

export function readEmotion(q: string): EmotionRead {
  const crisis = CRISIS.test(q); const declines = DECLINES.test(q);
  for (const [type, re] of PATTERNS) { const m = q.match(re); if (m) return { expressed: true, type, declines, crisis, quote: m[0].slice(0, 80) }; }
  return { expressed: false, type: null, declines, crisis, quote: null };
}

export interface Strategy { id: string; acknowledge: boolean; instructions: string; humanSupport: boolean; offerResource: boolean; askFollowUp: boolean; }
/** What the reply should do for an explicitly expressed emotion (spec 5.2). `followupAllowed` is false when the reader asked not to talk about feelings. */
export function strategyFor(e: EmotionRead, followupAllowed: boolean, young: boolean): Strategy | null {
  if (e.declines) return { id: "RESPECT_BOUNDARY", acknowledge: true, humanSupport: false, offerResource: false, askFollowUp: false,
    instructions: "The reader asked not to talk about feelings right now. Respect that: one short, kind sentence at most, then continue with the topic. Do not ask about feelings." };
  if (!e.expressed || !e.type) return null;
  const ask = followupAllowed;
  const S: Record<Emotion, Strategy> = {
    fear: { id: "FEAR_ACKNOWLEDGE_INFORM", acknowledge: true, humanSupport: true, offerResource: false, askFollowUp: ask, instructions: `Start by acknowledging the worry in one sentence. ${ask ? "If useful, ask what specifically worries them (one question). " : ""}Give accurate, age-appropriate information without overwhelming detail. Never promise that nothing bad will happen. Suggest a trusted adult or the care team can help.` },
    confusion: { id: "CONFUSION_REEXPLAIN", acknowledge: true, humanSupport: false, offerResource: false, askFollowUp: false, instructions: "Name the idea that seems confusing, reduce the number of new ideas, explain it a different way with an analogy, then offer to check understanding." },
    frustration: { id: "FRUSTRATION_ACKNOWLEDGE_SWITCH", acknowledge: true, humanSupport: false, offerResource: false, askFollowUp: false, instructions: "Acknowledge the frustration without arguing. Offer a short break or a completely different explanation. Do not repeat an approach that already failed." },
    sadness: { id: "SADNESS_ACKNOWLEDGE_CHOICE", acknowledge: true, humanSupport: true, offerResource: true, askFollowUp: false, instructions: "Acknowledge what they said without minimizing it. Let them decide whether to keep going. Mention that talking to a trusted adult can help." },
    curiosity: { id: "CURIOSITY_EXPAND", acknowledge: false, humanSupport: false, offerResource: true, askFollowUp: false, instructions: `Offer more detail and let them explore deeper${young ? ", while keeping it developmentally appropriate" : ""}.` },
    embarrassment: { id: "EMBARRASSMENT_NORMALIZE", acknowledge: true, humanSupport: false, offerResource: false, askFollowUp: false, instructions: "Say plainly that it is a good question and many people wonder the same thing. Then answer it." },
    uncertainty: { id: "UNCERTAINTY_ANTICIPATORY", acknowledge: true, humanSupport: true, offerResource: false, askFollowUp: false, instructions: "Acknowledge that not knowing can be hard. Explain what usually happens, in order, and say which details only their care team can confirm." },
  };
  return S[e.type];
}

/** Heuristic check of whether a reply acknowledged the feeling. Reported as heuristic, never as a validated measure. */
export const acknowledged = (reply: string) => /\b(it'?s (okay|ok|normal|understandable)|that makes sense|(i )?(can see|understand) (why|how)|lots of (kids|people)|many (kids|people)|it can (feel|be) (scary|hard|confusing|frustrating)|you'?re not alone|sorry (you|that)|thank you for (telling|sharing)|glad you (told|asked))\b/i.test(reply);
