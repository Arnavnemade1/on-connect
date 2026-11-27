import { summarise, summariseMem, BANK, CONDLABEL, type MemRun, type Run } from "./eval";
import { REFS } from "./literature";
import type { LogEvent, StudyRow } from "./store";
import { welch, mean } from "./stats";

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "n/a"); const pv = (p?: number) => (p == null ? "n/a" : p < 0.001 ? "p < .001" : `p = ${p.toFixed(3).replace(/^0/, "")}`);
const cite = (...ids: string[]) => "[" + ids.map(i => REFS.findIndex(r => r.id === i) + 1).join(", ") + "]";
export const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;

export interface PaperInput { runs: Run[]; mruns: MemRun[]; log: LogEvent[]; study: StudyRow[]; stamp: string; }
export function buildPaper(x: PaperInput): { abstract: string; body: string } {
  const S = summarise(x.runs), M = summariseMem(x.mruns); const models = [...new Set([...S.models, ...M.models])]; const tmpl = models.length > 0 && models.every(m => m === "onconnect-templates");
  const hasE = x.runs.length > 0, hasM = x.mruns.length > 0, hasS = x.study.length > 0;
  const adapt = S.pairs.find(p => p.x === "adaptive" && p.y === "baseline"), ageb = S.pairs.find(p => p.x === "age" && p.y === "baseline"), full = S.pairs.find(p => p.x === "adaptive" && p.y === "age");
  const gradeErrs = x.log.filter(e => e.grade != null && e.targetGrade != null).map(e => Math.abs(e.grade! - e.targetGrade!));
  const study = (c: string) => x.study.filter(r => r.condition === c).map(r => r.score / Math.max(1, r.total)); const sw = hasS ? welch(study("adapted"), study("generic")) : null;
  const NA = (what: string) => `[No data yet: ${what}]`;

  const abstract = [
    `Children with cancer and their families receive medical information that is often written for one reading level. We built Onconnect, a prototype that adapts explanations of procedures to a reader's age band, stated preferences and in-chat feedback, and records an auditable trace of each adaptation step.`,
    hasE ? `In an automated three-arm ablation (${[...new Set(x.runs.map(r => r.q))].length} questions, five developmental profiles, ${S.adaptive.n + S.age.n + S.baseline.n} answers; ${models.join(", ")}), the mean distance between an answer's Flesch–Kincaid grade and its target was ${f(S.adaptive.err)} for the full profile, ${f(S.age.err)} for age band only and ${f(S.baseline.err)} for a one-size-fits-all control${adapt?.w ? ` (full profile vs control: ${pv(adapt.pHolm).replace("p", "Holm-adjusted p")}, d = ${f(adapt.w.d)})` : ""}.` : `Results of an automated ablation are pending. ${NA("run Experiment 1 on the evaluation page")}`,
    hasM && M.t ? `In a scripted three-turn conversation, carrying chat memory forward changed the follow-up's reading grade by ${f(M.carried.mean)} compared with ${f(M.reset.mean)} when memory was wiped (${pv(M.t.p)}).` : "",
    hasS && sw ? `A comprehension study with ${x.study.length} participants found ${sw.diff > 0 ? "higher" : "lower"} quiz accuracy with adapted explanations (difference ${f(sw.diff)}, ${pv(sw.p)}).` : `No human-participant data have been collected; claims about comprehension are untested.`,
    `Readability is an automated proxy and the content has not been clinician-reviewed, so these results show that the adaptation mechanism behaves as designed, not that it improves understanding or care.`,
  ].filter(Boolean).join(" ");

  const body = `# Adaptive AI explanations of medical procedures for children with cancer: design and automated evaluation

_Auto-generated draft from your own data on ${new Date().toLocaleDateString()}. Every number below is read from the evaluation harness, audit log and study data stored in this browser. Edit before using. Sections in [brackets] need your input._

## Abstract
${abstract}

## 1. Introduction
Patients and families vary widely in age, prior knowledge and health literacy ${cite("iom04", "weiss05")}, yet written explanations are usually fixed. Instruction research suggests that support should match the learner's current level and be withdrawn as competence grows ${cite("vygotsky78", "wood76")}, and that limited working memory makes dense text harder to use ${cite("sweller88", "sweller98")}. Large language models can generate explanations at a requested level but can also produce fluent errors ${cite("ji23", "singhal23")}, so adaptation needs checks and a record of what was done.

**Research questions.** RQ1: Does conditioning an explanation on an age band, stated preferences and feedback bring its reading level closer to the intended target than a single generic explanation? RQ2: Does chat memory carry a reader's "I don't understand" forward to later answers? RQ3 (not yet tested): Does adaptation improve comprehension in human readers?

## 2. System
Each reply passes through a logged pipeline: safety scan, signal detection from the user's words (e.g. "simpler", "I don't understand"), memory update, topic retrieval, level and depth selection, generation, a validation step against a target reading grade and word cap (one regeneration if far off), an output guard for dosing or prognosis language, and an audit-log write. Targets are Flesch–Kincaid grades 3, 5.5, 8 and 11 for age bands 6–8, 9–11, 12–14 and 15–17 ${cite("flesch48", "kincaid75")}. These targets are design assumptions, not validated norms.

## 3. Methods
**Experiment 1 (ablation).** ${BANK.length} fixed questions (${BANK.filter(b => b.topic).length} grounded in curated topics, ${BANK.filter(b => !b.topic).length} general) were answered under three arms: ${Object.values(CONDLABEL).join("; ")}. Outcomes were absolute Flesch–Kincaid grade error against the band target, share of answers within ±2 grades, word-budget compliance and key-concept coverage (curated topics only).
**Experiment 2 (memory persistence).** Scripted conversations: ask about a topic; say "I don't understand, can you explain it more simply?"; ask a neutral follow-up. Memory was either carried to the follow-up or wiped; the outcome was the follow-up's grade minus the first answer's grade.
**Statistics.** Welch's t-test with Cohen's d ${cite("welch47", "cohen88")}, Mann–Whitney U as a rank-based check ${cite("mann47")}, percentile bootstrap intervals ${cite("efron79")}, Holm correction across the three arm comparisons ${cite("holm79")}. Effect sizes are reported alongside p-values ${cite("lakens13")}.
**Reproducibility.** Model(s): ${models.join(", ") || "n/a"}. Prompt versions: adaptive-v0.5, baseline-v1. Run: ${x.stamp ? new Date(x.stamp).toLocaleString() : "n/a"}.${tmpl ? " **Note: this run used the built-in template engine because the language model was unavailable; re-run before reporting.**" : ""}

## 4. Results
### 4.1 Reading-level fit (Experiment 1)
${hasE ? `${(["adaptive", "age", "baseline"] as const).map(c => `- ${CONDLABEL[c]}: grade error ${f(S[c].err)} (SD ${f(S[c].errSd)}; 95% CI ${f(S[c].errCi[0])} to ${f(S[c].errCi[1])}), ${Math.round(S[c].band * 100)}% within ±2 grades, ${Math.round(S[c].cap * 100)}% within the word budget, coverage ${f(S[c].cov)} (n = ${S[c].n}).`).join("\n")}

${[["Full profile vs control", adapt], ["Age band only vs control", ageb], ["Full profile vs age band only", full]].map(([l, p]) => { const q = p as typeof adapt; return q?.w ? `- ${l}: Δ error ${f(q.w.diff)}, Welch t(${f(q.w.df, 1)}) = ${f(q.w.t)}, ${pv(q.w.p)} (Holm ${pv(q.pHolm)}), d = ${f(q.w.d)}; Mann–Whitney ${pv(q.mw?.p)}.` : `- ${l}: not enough runs.`; }).join("\n")}` : NA("run Experiment 1")}

### 4.2 Memory persistence (Experiment 2)
${hasM && M.t ? `Memory carried: mean change in grade ${f(M.carried.mean)} (SD ${f(M.carried.sd)}, n = ${M.carried.n}). Memory wiped: ${f(M.reset.mean)} (SD ${f(M.reset.sd)}, n = ${M.reset.n}). Welch t(${f(M.t.df, 1)}) = ${f(M.t.t)}, ${pv(M.t.p)}, d = ${f(M.t.d)}; Mann–Whitney ${pv(M.mw?.p)}.` : NA("run Experiment 2")}

### 4.3 Live use (audit log)
${gradeErrs.length ? `Across ${gradeErrs.length} logged answers, mean grade error was ${f(mean(gradeErrs))}; ${Math.round(gradeErrs.filter(e => e <= 2).length / gradeErrs.length * 100)}% were within ±2 grades of their target. These come from informal use, not a designed sample.` : NA("use the chat so the audit log has entries")}

### 4.4 Human comprehension
${hasS && sw ? `${x.study.length} responses. Proportion correct: adapted ${f(mean(study("adapted")))} vs generic ${f(mean(study("generic")))}; difference ${f(sw.diff)} (95% CI ${f(sw.ci[0])} to ${f(sw.ci[1])}), Welch ${pv(sw.p)}, d = ${f(sw.d)}.` : `${NA("collect comprehension data with ethics approval")} Until then, no claim about comprehension should be made.`}

## 5. Limitations
- Flesch–Kincaid measures sentence and word length, not understanding, and is English-only.
- Question bank is small and fixed; answers are not independent across arms and ages, so p-values are indicative. A mixed-effects model with question as a random effect would be more appropriate.
- Model output varies between runs; one run is not a distribution.
- Age-band targets, signal patterns and the output guard are hand-written heuristics with unmeasured error rates.
- Medical content is unreviewed draft text. General-knowledge answers are not grounded.
- No human participants have been studied unless section 4.4 says otherwise.

## 6. Ethics
No human-participants data are reported unless stated. Any study with children requires review-board or school science review committee approval, parental permission and child assent before recruitment. The system gives general education, not individual medical advice.

## 7. Future work
Clinician review of all content with inter-rater agreement; a comprehension study with healthy volunteers on a non-clinical topic; a stronger control (fixed "explain to a 10-year-old" prompt); mixed-effects analysis; measuring the output guard's recall.

## References
${REFS.map((r, i) => `${i + 1}. ${r.cite}`).join("\n")}

_Reference list written from memory by an AI assistant; verify each entry against the source._
`;
  return { abstract, body };
}
