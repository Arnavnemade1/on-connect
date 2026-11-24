// Study-design helpers: seeded randomisation, counterbalancing, protocol text. Pure functions, unit-tested.
export function rng(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle<T>(a: T[], r: () => number) { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }

export interface Alloc { id: string; stratum: string; arm: string; block: number; }
/** Permuted-block randomisation within strata. Block size must be a multiple of the number of arms. Seeded, so the list is reproducible. */
export function blockRandomise(n: number, arms: string[], blockSize: number, strata: string[], seed: number): Alloc[] {
  if (arms.length < 2) throw new Error("need at least two arms"); if (blockSize % arms.length) throw new Error("block size must be a multiple of the number of arms");
  const r = rng(seed); const per = blockSize / arms.length; const out: Alloc[] = []; const st = strata.length ? strata : ["all"];
  const counts = new Map<string, { n: number; queue: string[]; block: number }>(); st.forEach(s => counts.set(s, { n: 0, queue: [], block: 0 }));
  for (let i = 0; i < n; i++) {
    const s = st[i % st.length]; const c = counts.get(s)!; if (!c.queue.length) { c.queue = shuffle(arms.flatMap(a => Array(per).fill(a)), r); c.block++; }
    out.push({ id: `P${String(i + 1).padStart(3, "0")}`, stratum: s, arm: c.queue.shift()!, block: c.block }); c.n++;
  }
  return out;
}
/** Williams-style balanced Latin square (even n) or plain cyclic square (odd n) for order counterbalancing. */
export function latinSquare(n: number): number[][] {
  const first: number[] = [0]; for (let i = 1, lo = 1, hi = n - 1; first.length < n; i++) first.push(i % 2 ? lo++ : hi--);
  return Array.from({ length: n }, (_, r) => first.map(v => (v + r) % n));
}
export interface Check { id: string; text: string; why: string; }
export const ETHICS: Check[] = [
  { id: "plan", text: "Written research plan, with hypothesis, procedures and analysis, finished before any data are collected", why: "Fairs and review boards expect a plan approved in advance, not reconstructed afterwards." },
  { id: "who", text: "Decided who the participants are, and whether children with cancer are in scope at all", why: "Seriously ill children are a vulnerable population. A student project almost never gets approval to recruit them. A common route is healthy age-matched volunteers on a non-clinical topic, plus clinician review of the content." },
  { id: "irb", text: "Review board (IRB / school SRC) approval obtained BEFORE recruiting or collecting any data", why: "Under the ISEF rules for human participants, approval must come first. Data collected earlier generally cannot be used. Check the current rules and your fair's own deadlines." },
  { id: "adult", text: "Adult sponsor and, if required, a qualified scientist or clinician identified", why: "Required sign-offs differ by risk level; confirm with your fair." },
  { id: "consent", text: "Parental permission and child assent forms ready, in plain language, with the right to stop at any time", why: "Minors cannot consent for themselves. Assent wording should match the age band." },
  { id: "privacy", text: "No names, faces or contact details stored with responses; participant IDs only; data kept on one secured device", why: "The app already stores data locally only. Keep the link between ID and person on paper, apart from the data." },
  { id: "risk", text: "Risk assessment done: no distressing content beyond everyday experience, a way to stop, a named adult to talk to", why: "Medical explanations can frighten. Use neutral procedures and avoid prognosis." },
  { id: "noadvice", text: "Participants told this is education, not medical advice; nothing is presented as diagnosing or treating anyone", why: "The app is not a medical device and its content is unreviewed draft." },
  { id: "content", text: "Medical content reviewed and signed off by a qualified clinician before any participant sees it", why: "Currently the content is unreviewed draft. The Clinician review page records this." },
  { id: "analysis", text: "Primary outcome, sample size and statistical test fixed in advance (pre-registered)", why: "Stops p-hacking and makes the result credible to judges." },
  { id: "data", text: "Plan for storing, sharing and deleting the data when the project ends", why: "Part of most review-board forms." },
];
export const CONSENT = {
  parent: (title: string, contact: string) => `# Parent/guardian permission: ${title}\n\n**Who is doing this?** [Student name], a student at [school], supervised by [adult sponsor].\n\n**What is it about?** We are testing whether explanations of medical pictures (like an X-ray) that are written for different ages are easier to understand. Your child will read one or two short explanations and answer a few questions. It takes about [10-15] minutes.\n\n**Is it safe?** The topics are everyday ones. There are no right or wrong answers about your child. Nothing here is medical advice.\n\n**Privacy.** We will not record your child's name. Answers are stored under a code number. Results will only be reported as group averages.\n\n**Your choice.** Taking part is voluntary. You or your child can stop at any time with no consequences.\n\n**Questions?** ${contact}\n\n☐ I give permission for my child to take part.   Parent/guardian name: ____________  Signature: ____________  Date: ________\n`,
  assent: (age: string) => age === "6-8"
    ? `# Can you help me?\n\nI want to find out which way of explaining is easiest to understand.\n\nI will show you something to read and ask you some questions. It is not a test, and you will not get in trouble for any answer.\n\nYou can stop whenever you want, just tell me.\n\n☐ Yes, I want to help.   ☐ No, thank you.\n\nName/sticker: ____________\n`
    : `# Assent to take part\n\nYou are being asked to help with a school research project about how medical information is explained. You will read a short explanation and answer some questions. This is not a test of you, and there is no penalty for any answer.\n\nYour parent or guardian has said it is okay, but it is your choice too. You can stop at any time without giving a reason. Your name will not be recorded with your answers.\n\n☐ I agree to take part.   ☐ I do not want to take part.\n\nSignature: ____________  Date: ________\n`,
};
export interface Protocol { title: string; question: string; h1: string; h2: string; h3: string; design: "between" | "within"; primary: string; secondary: string; population: string; exclusion: string; analysis: string; d: number; power: number; alpha: number; attrition: number; seed: number; arms: string; strata: string; block: number; }
export const PROTOCOL_DEFAULT: Protocol = {
  title: "Does age-adapted AI explanation improve understanding of medical imaging?",
  question: "Do explanations that are adapted to a reader's age band and feedback produce better understanding than a single one-size-fits-all explanation?",
  h1: "H1: Participants who read adapted explanations score higher on a 6-item comprehension quiz than those who read the generic explanation.",
  h2: "H2: Adapted explanations are rated clearer on a 5-point self-rating.",
  h3: "H3 (exploratory): Time to complete the quiz does not differ.",
  design: "between", primary: "Proportion correct on a 6-item multiple-choice comprehension quiz, scored 0 to 1.", secondary: "Self-rated clarity (1 to 5); time to finish (seconds).",
  population: "Healthy volunteers aged 9 to 17 recruited through [school/club], stratified by age band. [Not patients.]", exclusion: "Participants who have previously seen the content; incomplete responses (reported, not silently dropped).",
  analysis: "Primary: Welch's t-test on proportion correct with Cohen's d and 95% CI; Mann-Whitney U as sensitivity analysis. Secondary outcomes use Holm correction. Analysis is intention-to-treat. Two-sided alpha .05.",
  d: 0.5, power: 0.8, alpha: 0.05, attrition: 10, seed: 20250101, arms: "adapted, generic", strata: "9-11, 12-14, 15-17", block: 4,
};
export function protocolMd(p: Protocol, nGroup: number, total: number) {
  return `# ${p.title}\n\n_Draft pre-registration. Not yet reviewed by a review board. Generated ${new Date().toLocaleDateString()}._\n\n## Research question\n${p.question}\n\n## Hypotheses\n- ${p.h1}\n- ${p.h2}\n- ${p.h3}\n\n## Design\n${p.design === "between" ? "Between-subjects, randomised, two arms." : "Within-subjects, counterbalanced order."} Arms: ${p.arms}. Randomisation: permuted blocks of ${p.block}, stratified by ${p.strata || "none"}, seed ${p.seed}.\n\n## Participants\n${p.population}\n\nExclusions: ${p.exclusion}\n\n## Outcomes\n- Primary: ${p.primary}\n- Secondary: ${p.secondary}\n\n## Sample size\nTarget effect d = ${p.d}, power ${p.power}, alpha ${p.alpha}${p.design === "between" ? `. ${nGroup} per group` : `. ${nGroup} participants`}; allowing ${p.attrition}% attrition, recruit ${total}.\n\n## Analysis plan\n${p.analysis}\n\n## Ethics\nStudy will not begin until review board approval, parental permission and child assent are obtained. No identifiers are stored with responses.\n`;
}
