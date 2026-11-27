"use client";
// Science-fair project hub: research question, design, abstract built from your own measurements, rules checklist and board outline.
import Link from "next/link";
import { useMemo } from "react";
import { useLocal, useLog, useStudy } from "@/lib/store";
import { buildPaper, wordCount } from "@/lib/paper";
import { summarise, type MemRun, type Run } from "@/lib/eval";
import { VERSIONS } from "@/lib/versions";
import { RULES, REFS } from "@/lib/literature";
import { SOURCES } from "@/lib/sources";

const FORMS: [string, string, string][] = [
  ["Research Plan / Project Summary", "Everyone", "Question, hypotheses, procedures, risks and data analysis, written before experimentation."],
  ["Form 1A: Student Checklist", "Everyone", "Dates, title and whether human participants are involved."],
  ["Form 1: Checklist for Adult Sponsor", "Everyone", "Signed by your adult sponsor."],
  ["Form 1B: Approval Form", "Everyone", "Signatures, including SRC/IRB approval where required, before experimentation starts."],
  ["Form 4: Human Participants and IRB", "Phase 2 only", "Any study with people (surveys, comprehension tests) needs IRB approval before you begin."],
  ["Informed consent and assent", "Phase 2 only", "Parental permission and child assent for minors. Templates are on the Protocol page."],
  ["Form 1C: Regulated Research Institutional Setting", "If done at a hospital or university", "Completed by the institution's supervisor."],
];
const BOARD: [string, string][] = [["Title and question", "What is being tested, in one line."], ["Abstract", "250 words, from the box below."], ["Background", "Why children need adapted explanations, with the verified references."], ["Engineering design", "The 11-component architecture and the adaptation policy (Method page)."],
  ["Procedure", "Phase 1 computational evaluation; Phase 2 protocol if approved."], ["Results", "Ablation chart, memory experiment, citation audit, with intervals and corrected p-values."], ["Conclusions and limits", "What the numbers show, and what they do not (no claim about real children without Phase 2)."], ["Ethics and safety", "No diagnosis, crisis escalation, consent, pseudonymized data, audit log."]];

export default function Isef() {
  const [runs] = useLocal<Run[]>("onc.eval", []); const [mruns] = useLocal<MemRun[]>("onc.evalmem", []); const [log] = useLog(); const [study] = useStudy();
  const paper = useMemo(() => buildPaper({ runs, mruns, log, study, stamp: new Date().toISOString() }), [runs, mruns, log, study]);
  const S = useMemo(() => (runs.length ? summarise(runs) : null), [runs]); const modelRuns = runs.filter(r => r.model !== "onconnect-templates" && !r.err).length;
  const words = wordCount(paper.abstract);
  return (<>
    <div className="eyebrow">Research · Science fair</div><h1>Project hub</h1>
    <p>Everything a judge will ask about, in one place. Numbers come only from what you have measured; anything missing says so.</p>
    <div className="callout"><b>Check the current rules.</b> Science fairs affiliated with Regeneron ISEF (including SEFH) follow the ISEF Rules and Guidelines for the current year. Confirm form names and requirements with your SRC before you start, and never collect data from people before approval.</div>

    <section className="rsec"><h2>Research question</h2><p className="lede">Does a developmentally, linguistically and psychologically adaptive AI system produce explanations of pediatric cancer procedures that fit the reader better than a non-adaptive AI, while staying accurate and safe?</p>
      <div className="three2"><div><h3>H1 · Reading fit</h3><p className="muted">Full adaptation brings answers closer to each profile&apos;s target reading grade than a non-adaptive control.</p></div><div><h3>H2 · Memory</h3><p className="muted">Carrying memory forward after “I don&apos;t understand” makes follow-up answers simpler than wiping it.</p></div><div><h3>H3 · Grounding</h3><p className="muted">Most factual sentences are cited to verified sources that their passages support.</p></div></div></section>

    <section className="rsec"><h2>Design in two phases</h2><div className="two"><div><h3>Phase 1: computational evaluation</h3><p>The system is tested with scripted questions, not people: a three-arm ablation (non-adaptive, age profile only, full adaptation) across five developmental profiles, a memory-persistence experiment, and a citation audit. Outcomes are rule-based (Flesch–Kincaid grade error, word caps, citation matching), not judged by another AI.</p>
        <p className="muted">Status: {runs.length ? `${runs.length} runs stored, ${modelRuns} from the AI model` : "not run yet"}. <Link href="/eval">Open the evaluation harness</Link></p></div>
      <div><h3>Phase 2: comprehension study (needs approval)</h3><p>A randomized comparison of adapted and generic explanations with a short quiz, planned with a power analysis and pre-registered. Because it involves people, and likely minors, it requires IRB approval, parental permission and child assent before any data are collected. Children with cancer are a vulnerable population; a student project should plan for healthy volunteers and a non-clinical topic unless a hospital IRB says otherwise.</p>
        <p className="muted"><Link href="/protocol">Protocol, power and consent templates</Link> · <Link href="/study">Study runner</Link></p></div></div></section>

    <section className="rsec"><h2>Abstract</h2><p className="muted">{words} of 250 words. Built from your measurements; edit it before submitting.</p><div className="abstract">{paper.abstract}</div>
      {S && <p className="muted">Grade error: full adaptation {S.adaptive.err.toFixed(2)}, age only {S.age.err.toFixed(2)}, control {S.baseline.err.toFixed(2)} (n = {S.adaptive.n}, {S.age.n}, {S.baseline.n}).</p>}
      <div className="row"><button className="btn alt" onClick={() => navigator.clipboard?.writeText(paper.abstract)}>Copy abstract</button><Link className="btn alt" href="/paper">Full paper draft</Link></div></section>

    <section className="rsec"><h2>Forms checklist</h2><div className="wrap"><table><thead><tr><th>Form</th><th>Needed for</th><th>What it covers</th></tr></thead><tbody>{FORMS.map(([f, w, d]) => <tr key={f}><td><b>{f}</b></td><td>{w}</td><td className="muted">{d}</td></tr>)}</tbody></table></div>
      <p className="muted">Phase 1 alone involves no human participants. Phase 2 adds human-participant forms and must be approved first.</p></section>

    <section className="rsec"><h2>Board outline</h2><ol className="plain">{BOARD.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol></section>

    <section className="rsec"><h2>What makes it rigorous</h2><ul className="plain">
      <li>{RULES.length} adaptation mechanisms, each with a research record and {REFS.filter(r => r.verified !== "not_machine_verifiable").length} of {REFS.length} references checked against Crossref, PubMed or a library catalog.</li>
      <li>{SOURCES.length} medical sources, every link checked, with stored passages so citations are matched to real text.</li>
      <li>Every adaptation is logged with its reason, scope and outcome, and can be reversed; acceptance tests map one-to-one to the specification.</li>
      <li>Statistics report effect sizes, bootstrap intervals and Holm-corrected p-values, and never treat several messages from one person as independent.</li>
      <li>System <code>{VERSIONS.system}</code>; every answer records the versions that produced it.</li></ul></section>
  </>);
}
