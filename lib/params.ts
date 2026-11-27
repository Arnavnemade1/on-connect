// Adaptation parameter registry (spec 4.3, 8.2).
// Every parameter is an ordinal engineering setting with named levels. The numbers are indexes into those levels,
// not validated psychological or reading scales, and they are documented as such everywhere they are shown.
import { LEVELS, type Level } from "./content";

export type Component = "Developmental Adaptation Engine" | "Linguistic Adaptation Engine" | "Psychological Communication Engine" | "Comprehension and Learning Engine" | "Response Revision Engine" | "Patient Context Manager";
export type ParamId = "reading_level" | "explanation_depth" | "response_length" | "terminology_density" | "definition_frequency" | "analogy_usage" | "concept_density" | "information_pacing" | "structure" | "visual_support" | "teachback_frequency" | "emotional_followup";

export interface ParamDef { id: ParamId; label: string; component: Component; values: string[]; describe: string; }
export const REGISTRY: ParamDef[] = [
  { id: "reading_level", label: "Reading level", component: "Developmental Adaptation Engine", values: ["Ages 3–5", "Ages 6–8", "Ages 9–12", "Ages 13–15", "Ages 16–18"], describe: "Which developmental profile's wording and Flesch–Kincaid target the answer aims for." },
  { id: "explanation_depth", label: "Explanation depth", component: "Developmental Adaptation Engine", values: ["Simple", "Standard", "Expanded"], describe: "How much technical detail is included." },
  { id: "response_length", label: "Response length", component: "Linguistic Adaptation Engine", values: ["Short", "Medium", "Long"], describe: "Word cap for the answer." },
  { id: "terminology_density", label: "Terminology density", component: "Linguistic Adaptation Engine", values: ["Low", "Moderate", "High"], describe: "How often medical terms are used instead of everyday words." },
  { id: "definition_frequency", label: "Definition frequency", component: "Linguistic Adaptation Engine", values: ["Key terms only", "Most terms", "Every new term"], describe: "How often new terms are defined." },
  { id: "analogy_usage", label: "Analogy usage", component: "Linguistic Adaptation Engine", values: ["Rare", "Occasional", "Frequent"], describe: "How often familiar comparisons are used." },
  { id: "concept_density", label: "Concept density", component: "Developmental Adaptation Engine", values: ["One idea at a time", "Standard", "Several ideas"], describe: "How many new concepts one answer introduces." },
  { id: "information_pacing", label: "Information pacing", component: "Developmental Adaptation Engine", values: ["Slower", "Standard"], describe: "Whether new information is held back until the current idea lands." },
  { id: "structure", label: "Response structure", component: "Linguistic Adaptation Engine", values: ["Paragraphs", "Step by step"], describe: "Prose or a numbered sequence." },
  { id: "visual_support", label: "Visual support", component: "Developmental Adaptation Engine", values: ["Standard", "High"], describe: "Whether to point to diagrams and picture-based explanations." },
  { id: "teachback_frequency", label: "Teach-back frequency", component: "Comprehension and Learning Engine", values: ["Off", "Standard", "Increased"], describe: "Whether a quick comprehension check follows each explanation (Standard: one per explanation, rotating through the topic's questions)." },
  { id: "emotional_followup", label: "Emotional follow-up", component: "Psychological Communication Engine", values: ["Paused", "Normal"], describe: "Whether the companion may gently ask about feelings. Paused when the reader asks not to talk about it." },
];
export const PARAM = Object.fromEntries(REGISTRY.map(p => [p.id, p])) as Record<ParamId, ParamDef>;
export type Config = Record<ParamId, number>;
export const label = (id: ParamId, v: number) => PARAM[id].values[Math.max(0, Math.min(PARAM[id].values.length - 1, v))];
export const clampParam = (id: ParamId, v: number) => Math.max(0, Math.min(PARAM[id].values.length - 1, Math.round(v)));

interface ProfileLike { age: Level; detail: "short" | "balanced" | "detailed"; format: string[]; }
/** The starting configuration for a profile: the age band's defaults (spec 4.1) plus the reader's stated preferences. */
export function initialConfig(p: ProfileLike): Config {
  const a = Math.max(0, LEVELS.indexOf(p.age)); const d = ({ short: 0, balanced: 1, detailed: 2 } as const)[p.detail] ?? 1; const f = (x: string) => p.format.includes(x);
  return {
    reading_level: a,
    explanation_depth: a === 0 ? Math.min(d, 1) : d,
    response_length: a === 0 ? Math.min(d, 1) : d,
    terminology_density: [0, 0, 1, 1, 2][a],
    definition_frequency: a === 0 ? 0 : f("define") || a === 1 ? 2 : 1,           // 3–5: limited terminology (spec 4.1)
    analogy_usage: f("examples") || a <= 1 ? 2 : 1,
    concept_density: a === 0 ? 0 : 1,
    information_pacing: a === 0 ? 0 : 1,
    structure: f("steps") ? 1 : 0,
    visual_support: a <= 1 ? 1 : 0,
    teachback_frequency: f("check") ? 2 : 1,
    emotional_followup: 1,
  };
}

export const diffConfig = (a: Config, b: Config) => REGISTRY.filter(p => a[p.id] !== b[p.id]).map(p => ({ id: p.id, from: a[p.id], to: b[p.id] }));
