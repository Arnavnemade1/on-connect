// Brings data saved by older versions up to the current shape, so old chats never crash new pages. Idempotent.
// Schema 3: five developmental profiles (spec 4.1) and the structured memory (spec 7, 22.2).
import { DEFAULT_MEMORY, migrateMemory } from "./memory";
export const SCHEMA = 3;
/** The old four bands map onto the five spec profiles by overlap: 9–11 → 9–12, 12–14 → 13–15, 15–17 → 16–18. */
export const AGE_MAP: Record<string, string> = { "9-11": "9-12", "12-14": "13-15", "15-17": "16-18" };
export const mapAge = <T,>(a: T): T => ((typeof a === "string" && AGE_MAP[a]) ? (AGE_MAP[a] as unknown as T) : a);

export function migrateConvos(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(c => c && typeof c === "object" && Array.isArray((c as { msgs?: unknown }).msgs)).map(c => {
    const cv = c as { msgs: Record<string, unknown>[] };
    return { ...cv, msgs: cv.msgs.filter(m => m && typeof m.text === "string").map(m => {
      const r = m.reply as Record<string, unknown> | undefined; if (!r || typeof r !== "object") return m;
      return { ...m, reply: { ...r, trace: Array.isArray(r.trace) ? r.trace : [], memory: r.memory && (r.memory as { schema?: number }).schema === 3 ? r.memory : DEFAULT_MEMORY, signals: Array.isArray(r.signals) ? r.signals : [], used: r.used ?? [], changed: r.changed ?? [], notDone: r.notDone ?? [], adaptations: r.adaptations ?? [] } };
    }) };
  });
}
const rewrite = (key: string, fn: (v: unknown) => unknown) => { const raw = localStorage.getItem(key); if (raw) localStorage.setItem(key, JSON.stringify(fn(JSON.parse(raw)))); };
const mapRows = (v: unknown) => (Array.isArray(v) ? v.map(r => (r && typeof r === "object" ? { ...r, age: mapAge((r as { age?: unknown }).age) } : r)) : v);

export function migrateStorage() {
  try {
    if (Number(localStorage.getItem("onc.schema")) >= SCHEMA) return;
    rewrite("onc.convos", migrateConvos);
    rewrite("onc.memory", migrateMemory);
    rewrite("onc.profile", p => (p && typeof p === "object" ? { ...p, age: mapAge((p as { age?: unknown }).age) } : p));
    for (const k of ["onc.log", "onc.study", "onc.eval", "onc.evalmem"]) rewrite(k, mapRows);
    localStorage.setItem("onc.schema", String(SCHEMA));
  } catch { /* corrupt storage: pages already fall back to defaults */ }
}
