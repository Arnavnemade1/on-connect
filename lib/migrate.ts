// Brings data saved by older versions up to the current shape, so old chats never crash new pages. Idempotent.
import { DEFAULT_MEMORY } from "./memory";
export const SCHEMA = 2;
export function migrateConvos(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(c => c && typeof c === "object" && Array.isArray((c as { msgs?: unknown }).msgs)).map(c => {
    const cv = c as { msgs: Record<string, unknown>[] };
    return { ...cv, msgs: cv.msgs.filter(m => m && typeof m.text === "string").map(m => {
      const r = m.reply as Record<string, unknown> | undefined; if (!r || typeof r !== "object") return m;
      return { ...m, reply: { ...r, trace: Array.isArray(r.trace) ? r.trace : [], memory: r.memory ?? DEFAULT_MEMORY, signals: Array.isArray(r.signals) ? r.signals : [], used: r.used ?? [], changed: r.changed ?? [], notDone: r.notDone ?? [], adaptations: r.adaptations ?? [] } };
    }) };
  });
}
export function migrateStorage() {
  try {
    if (Number(localStorage.getItem("onc.schema")) >= SCHEMA) return;
    const raw = localStorage.getItem("onc.convos"); if (raw) localStorage.setItem("onc.convos", JSON.stringify(migrateConvos(JSON.parse(raw))));
    const mem = localStorage.getItem("onc.memory"); if (mem) { const m = JSON.parse(mem); localStorage.setItem("onc.memory", JSON.stringify({ ...DEFAULT_MEMORY, ...m, confusion: m?.confusion ?? {}, understood: m?.understood ?? {}, events: m?.events ?? [] })); }
    localStorage.setItem("onc.schema", String(SCHEMA));
  } catch { /* corrupt storage: pages already fall back to defaults */ }
}
