// Version registry, architecture change log and comparable configurations (spec Part XIII, 22.5).
// Every AI message records the `VERSIONS` that produced it. Rollback references are real git commits.
import { POLICY_VERSION } from "./memory";
import { KB_VERSION, RETRIEVAL_VERSION } from "./sources";
import { GUIDELINE_VERSION } from "./guidelines";

export const PROMPT_VERSION = "adaptive-v0.7";
export const VERSIONS = {
  system: "onconnect-0.7.0",
  orchestration: "orchestrator-0.6",
  prompt: PROMPT_VERSION,
  adaptationPolicy: POLICY_VERSION,
  developmentalPolicy: "developmental-2.0",
  linguisticPolicy: "linguistic-1.1",
  psychologicalPolicy: "psychological-1.0",
  retrieval: RETRIEVAL_VERSION,
  knowledgeBase: KB_VERSION,
  safetyPolicy: "safety-1.2",
  memorySchema: "memory-3",
  measurement: "metrics-1.2",
  guidelines: GUIDELINE_VERSION,
} as const;
export type Versions = typeof VERSIONS;
export const VERSION_LABEL: Record<keyof Versions, string> = { system: "System", orchestration: "Orchestration", prompt: "System instructions", adaptationPolicy: "Adaptation policy", developmentalPolicy: "Developmental policy", linguisticPolicy: "Linguistic policy", psychologicalPolicy: "Psychological policy", retrieval: "Retrieval configuration", knowledgeBase: "Knowledge base", safetyPolicy: "Safety policy", memorySchema: "Memory schema", measurement: "Measurement definitions" , guidelines: "Communication guidelines" };

export interface Change { id: string; date: string; component: string; prev: string; next: string; by: string; reason: string; expected: string; tests: string; validation: "Untested" | "Unit-tested" | "Evaluated offline" | "Awaiting prospective evaluation"; deployment: "Development" | "Research environment" | "Production prototype"; rollback: string; }
export const CHANGELOG: Change[] = [
  { id: "ALG-001", date: "2026-11-23", component: "Whole system", prev: "none", next: "0.1", by: "Project developer", reason: "First prototype: template explanations at four reading levels with a research panel.", expected: "A baseline to measure later changes against.", tests: "Manual", validation: "Untested", deployment: "Development", rollback: "dc95773" },
  { id: "ALG-002", date: "2026-11-23", component: "Memory Management Engine", prev: "none", next: "memory-1", by: "Project developer", reason: "Spec Part VII: the companion should change future answers after “simpler” or “I don't understand”.", expected: "Fewer repeated clarification requests in the same conversation.", tests: "Unit tests for signal detection and memory updates", validation: "Unit-tested", deployment: "Development", rollback: "cc7a028" },
  { id: "ALG-003", date: "2026-11-24", component: "Orchestration and validation", prev: "templates only", next: "adaptive-v0.5", by: "Project developer", reason: "Language model generation with a reading-grade validator that regenerates once when an answer is far off target.", expected: "Answers closer to the target reading grade than unvalidated generation.", tests: "Pipeline tests against a mock model server", validation: "Unit-tested", deployment: "Production prototype", rollback: "32bedf7" },
  { id: "ALG-004", date: "2026-11-24", component: "Model provider", prev: "Gemini", next: "OpenRouter (configured model)", by: "Project developer", reason: "The Gemini key was rejected; the provider was separated from the adaptive layer (spec 21.5).", expected: "No change to adaptation behaviour, only to which model writes.", tests: "Provider selection and streaming tests", validation: "Unit-tested", deployment: "Production prototype", rollback: "30961eb" },
  { id: "ALG-005", date: "2026-11-27", component: "Developmental Adaptation Engine", prev: "developmental-1.0 (4 profiles)", next: "developmental-2.0 (5 profiles)", by: "Project developer", reason: "Spec 4.1 requires five profiles: 3–5, 6–8, 9–12, 13–15, 16–18.", expected: "Ages 3–5 get shorter, more concrete answers; older bands align with the spec.", tests: "Engine tests across all five profiles; saved-data migration test", validation: "Unit-tested", deployment: "Research environment", rollback: "29ac2d1" },
  { id: "ALG-006", date: "2026-11-27", component: "Adaptation policy and memory", prev: "memory-1 (three numbers)", next: `${POLICY_VERSION}, memory-3`, by: "Project developer", reason: "Spec 8.2–8.3 and 22.2: a named parameter registry, events with reasons and scope, records with source, confidence, status and expiry, and reversal.", expected: "Every change is traceable and reversible; one-off requests stop becoming permanent.", tests: "Policy, reversal, expiry and correction tests", validation: "Unit-tested", deployment: "Research environment", rollback: "29ac2d1" },
  { id: "ALG-007", date: "2026-11-27", component: "Psychological Communication Engine", prev: "distress redirect only", next: "psychological-1.0", by: "Project developer", reason: "Spec Part V: respond to stated fear, confusion, frustration, sadness, curiosity, embarrassment and uncertainty, and respect “I don't want to talk about it”.", expected: "Stated feelings are acknowledged; no unrequested emotional questioning.", tests: "Emotion detection and strategy tests", validation: "Awaiting prospective evaluation", deployment: "Research environment", rollback: "29ac2d1" },
  { id: "ALG-008", date: "2026-11-27", component: "Retrieval and citations", prev: "draft content only", next: `${RETRIEVAL_VERSION}, ${KB_VERSION}`, by: "Project developer", reason: "Spec 21.7 and 22.4: cite verified sources per claim and check that citations match source text.", expected: "Most factual sentences carry a citation that matches a stored passage.", tests: "Citation checker tests; link check script", validation: "Unit-tested", deployment: "Research environment", rollback: "29ac2d1" },
];

/** Comparable, machine-readable configurations for the diff viewer (spec 13.4). */
export const CONFIGS: Record<string, Record<string, unknown>> = {
  "adaptive-v0.5": { developmental_profiles: ["6-8", "9-11", "12-14", "15-17"], target_grades: [3, 5.5, 8, 11], word_caps: [70, 140, 260], adaptation_parameters: ["level_shift", "length_bias", "scaffold"], one_request_scope: "persistent", repeated_pattern_rule: false, memory_records: false, reversal: false, emotions_handled: ["distress"], teach_back: false, citations: "none", source_check: false, regenerate_if: "grade > target+3 or words > cap×1.6", output_guard: "dosing, prognosis, personal diagnosis", community_resources: false },
  "adaptive-v0.6": { developmental_profiles: ["3-5", "6-8", "9-12", "13-15", "16-18"], target_grades: [1.5, 3, 5.5, 8, 11], word_caps: "by profile and response length (40–340)", adaptation_parameters: ["reading_level", "explanation_depth", "response_length", "terminology_density", "definition_frequency", "analogy_usage", "concept_density", "information_pacing", "structure", "visual_support", "teachback_frequency", "emotional_followup"], one_request_scope: "session", repeated_pattern_rule: "2 turns → persistent observed preference (medium confidence, unconfirmed)", memory_records: true, reversal: true, emotions_handled: ["distress", "fear", "confusion", "frustration", "sadness", "curiosity", "embarrassment", "uncertainty", "declines emotional talk"], teach_back: "quiz bank, by teach-back frequency", citations: "per sentence, numbered, verified sources only", source_check: "lexical overlap with stored passages", regenerate_if: "grade > target+3 or words > cap×1.6", output_guard: "dosing, prognosis, personal diagnosis", community_resources: "verified directory only" },
};
export function diffConfigs(a: Record<string, unknown>, b: Record<string, unknown>) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]; const j = (v: unknown) => JSON.stringify(v);
  return keys.map(k => ({ key: k, kind: !(k in a) ? "added" as const : !(k in b) ? "removed" as const : j(a[k]) === j(b[k]) ? "same" as const : "changed" as const, from: a[k], to: b[k] }));
}
