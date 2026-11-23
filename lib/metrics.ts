import { GLOSSARY } from "./content";
function syl(w: string) { w = w.toLowerCase().replace(/[^a-z]/g, ""); if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, ""); return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length); }
export interface Metrics { words: number; sentences: number; avgSentence: number; grade: number; terms: number; }
export function metrics(text: string): Metrics {
  const clean = text.replace(/^[•\d.]+\s*/gm, "");
  const words = clean.match(/[A-Za-z']+/g) ?? [];
  const sentences = Math.max(1, (clean.match(/[.!?]+(\s|$)/g) ?? []).length);
  const sy = words.reduce((a, w) => a + syl(w), 0);
  const n = Math.max(1, words.length);
  const grade = Math.max(0, +(0.39 * (n / sentences) + 11.8 * (sy / n) - 15.59).toFixed(1));
  const lower = text.toLowerCase();
  const terms = Object.keys(GLOSSARY).filter(k => lower.includes(k)).length;
  return { words: words.length, sentences, avgSentence: +(n / sentences).toFixed(1), grade, terms };
}
// Heuristic: share of the topic's key concepts that appear in the answer.
export function coverage(text: string, concepts: string[]): number {
  if (!concepts.length) return 0;
  const l = text.toLowerCase();
  return +(concepts.filter(c => l.includes(c.toLowerCase())).length / concepts.length).toFixed(2);
}
