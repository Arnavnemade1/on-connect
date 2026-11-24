import { mean, sd, welch, holm, bootstrapCI, mannWhitney } from "./stats";
import { BASE_GRADE, WORDS } from "./engine";
import type { Level } from "./content";
export const AGES: Level[] = ["6-8", "9-11", "12-14", "15-17"];
// Ablation arms: each adds one ingredient. baseline = nothing, age = reading level only, adaptive = age + preferences (+ memory in multi-turn use).
export type Cond = "baseline" | "age" | "adaptive";
export const CONDS: Cond[] = ["baseline", "age", "adaptive"];
export const CONDLABEL: Record<Cond, string> = { baseline: "Control (no adaptation)", age: "Age band only", adaptive: "Full profile" };
export interface Item { q: string; topic: boolean; }
// Benchmark questions: curated-topic questions (coverage can be scored) plus general oncology-adjacent questions (it cannot).
export const BANK: Item[] = [
  ...["What is a biopsy?", "What is an MRI?", "What is a CT scan?", "What is an ultrasound?", "What is a blood test?", "What is a catheter placement?", "What is embolization?", "What is tumor ablation?", "What does my diagnosis mean?"].map(q => ({ q, topic: true })),
  ...["What does chemotherapy do?", "Why do people lose their hair during treatment?", "What is a white blood cell count?", "Why am I so tired?"].map(q => ({ q, topic: false })),
];
export interface Run { id: string; q: string; topic: boolean; age: Level; cond: Cond; grade: number; words: number; coverage: number | null; model: string; ms: number; err: string | null; }
const ai = (a: Level) => AGES.indexOf(a);
export const targetGrade = (a: Level) => BASE_GRADE[ai(a)];
export const wordCap = (_a: Level) => WORDS[1]; // eval uses balanced detail
export const gradeErr = (r: Run) => Math.abs(r.grade - targetGrade(r.age));
export const inBand = (r: Run) => gradeErr(r) <= 2;
export const withinCap = (r: Run) => r.words <= wordCap(r.age) * 1.3;

export function summarise(runs: Run[]) {
  const ok = runs.filter(r => !r.err); const by = (c: Cond) => ok.filter(r => r.cond === c);
  const one = (rs: Run[]) => { const e = rs.map(gradeErr); const cov = rs.filter(r => r.coverage != null).map(r => r.coverage!);
    return { n: rs.length, err: mean(e), errSd: sd(e), errCi: bootstrapCI(e), band: rs.length ? rs.filter(inBand).length / rs.length : NaN, cap: rs.length ? rs.filter(withinCap).length / rs.length : NaN, cov: mean(cov), words: mean(rs.map(r => r.words)) }; };
  const A = by("adaptive"), B = by("baseline"), G = by("age");
  const perAge = AGES.map(a => ({ age: a, target: targetGrade(a), adaptive: mean(A.filter(r => r.age === a).map(r => r.grade)), baseline: mean(B.filter(r => r.age === a).map(r => r.grade)), age_only: mean(G.filter(r => r.age === a).map(r => r.grade)) }));
  // Pairwise comparisons on grade error, Holm-adjusted across the three.
  const pairs: [Cond, Cond][] = [["adaptive", "baseline"], ["age", "baseline"], ["adaptive", "age"]];
  const raw = pairs.map(([x, y]) => { const ex = by(x).map(gradeErr), ey = by(y).map(gradeErr); return { x, y, w: welch(ex, ey), mw: mannWhitney(ex, ey) }; });
  const adj = holm(raw.map(r => r.w?.p ?? 1));
  return { adaptive: one(A), baseline: one(B), age: one(G), perAge,
    pairs: raw.map((r, i) => ({ ...r, pHolm: adj[i] })),
    tErr: welch(A.map(gradeErr), B.map(gradeErr)), tCov: welch(A.filter(r => r.coverage != null).map(r => r.coverage!), B.filter(r => r.coverage != null).map(r => r.coverage!)),
    models: [...new Set(ok.map(r => r.model))], failed: runs.length - ok.length };
}
export const runsCsv = (runs: Run[]) => ["id,q,topic,age,condition,grade,words,coverage,model,ms,error", ...runs.map(r => [r.id, r.q, r.topic, r.age, r.cond, r.grade, r.words, r.coverage ?? "", r.model, r.ms, r.err ?? ""].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

// ---- Experiment 2: does the memory persist? Three turns: ask, say "I don't understand", then ask a neutral follow-up. ----
export type MemCond = "carried" | "reset";
export interface MemRun { q: string; age: Level; cond: MemCond; g1: number; g3: number; w1: number; w3: number; model: string; err: string | null; }
export const MEM_QS = BANK.filter(b => b.topic).map(b => b.q);
export const delta = (r: MemRun) => r.g3 - r.g1;
export function summariseMem(runs: MemRun[]) {
  const ok = runs.filter(r => !r.err); const c = ok.filter(r => r.cond === "carried").map(delta), s = ok.filter(r => r.cond === "reset").map(delta);
  const wc = ok.filter(r => r.cond === "carried").map(r => r.w3 - r.w1), ws = ok.filter(r => r.cond === "reset").map(r => r.w3 - r.w1);
  return { carried: { n: c.length, mean: mean(c), sd: sd(c), ci: bootstrapCI(c) }, reset: { n: s.length, mean: mean(s), sd: sd(s), ci: bootstrapCI(s) }, t: welch(c, s), mw: mannWhitney(c, s), wordsCarried: mean(wc), wordsReset: mean(ws), models: [...new Set(ok.map(r => r.model))], failed: runs.length - ok.length };
}
