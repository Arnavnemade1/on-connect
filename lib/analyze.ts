import { bootstrapCI, cohenKappa, hedgesG, holm, mannWhitney, mean, mdes, sd, welch } from "./stats";
export interface Group { name: string; values: number[]; }
export function compare(a: Group, b: Group) {
  const w = welch(a.values, b.values), mw = mannWhitney(a.values, b.values);
  return { a: { name: a.name, n: a.values.length, mean: mean(a.values), sd: sd(a.values), ci: bootstrapCI(a.values) }, b: { name: b.name, n: b.values.length, mean: mean(b.values), sd: sd(b.values), ci: bootstrapCI(b.values) },
    w, mw, g: hedgesG(a.values, b.values), mdes: Math.min(a.values.length, b.values.length) >= 2 ? mdes(Math.min(a.values.length, b.values.length)) : NaN };
}
/** Parse simple CSV (quoted fields allowed). Returns header + rows of strings. */
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = []; let cur: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true; else if (c === ",") { cur.push(f); f = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; cur.push(f); f = ""; if (cur.some(x => x.trim())) rows.push(cur); cur = []; } else f += c; }
  cur.push(f); if (cur.some(x => x.trim())) rows.push(cur);
  return { header: (rows.shift() ?? []).map(h => h.trim()), rows };
}
export function groupsFrom(rows: string[][], gi: number, vi: number): Group[] {
  const m = new Map<string, number[]>(); for (const r of rows) { const v = Number(r[vi]); if (!Number.isFinite(v) || r[vi]?.trim() === "") continue; const g = (r[gi] ?? "").trim(); if (!m.has(g)) m.set(g, []); m.get(g)!.push(v); }
  return [...m.entries()].map(([name, values]) => ({ name, values }));
}
export { cohenKappa, holm };
