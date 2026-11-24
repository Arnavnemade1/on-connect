import { describe, it, expect } from "vitest";
import { buildPaper, wordCount } from "@/lib/paper";
import type { MemRun, Run } from "@/lib/eval";

const empty = { runs: [], mruns: [], log: [], study: [], stamp: "" };
describe("paper draft", () => {
  it("marks missing data instead of inventing results", () => { const p = buildPaper(empty); expect(p.body).toMatch(/No data yet/); expect(p.abstract).toMatch(/No human-participant data/); expect(p.abstract).not.toMatch(/p < \.001|d = /); });
  it("fills numbers from real runs and keeps the limitations section", () => {
    const T = { "6-8": 3, "9-11": 5.5, "12-14": 8, "15-17": 11 } as const; const runs: Run[] = []; let i = 0;
    for (const age of Object.keys(T) as Run["age"][]) for (let k = 0; k < 6; k++) for (const [cond, off] of [["adaptive", (k % 3) - 1], ["age", (k % 3) - 1 + 0.5], ["baseline", 8 - T[age] + (k % 3)]] as const) runs.push({ id: String(i++), q: "q" + k, topic: true, age, cond, grade: T[age] + off, words: 100, coverage: 0.8, model: "gemini-3-flash-preview", ms: 1, err: null });
    const p = buildPaper({ ...empty, runs, stamp: "2026-01-01T00:00:00Z" }); expect(p.abstract).toMatch(/full profile/); expect(p.body).toMatch(/Holm/); expect(p.body).toMatch(/## 5\. Limitations/); expect(p.body).not.toMatch(/built-in template engine because/);
  });
  it("warns when results came from the template engine", () => { const runs: Run[] = ["adaptive", "baseline"].flatMap((cond, c) => Array.from({ length: 4 }, (_, k) => ({ id: `${c}${k}`, q: "q", topic: true, age: "9-11" as const, cond: cond as Run["cond"], grade: 5 + k, words: 50, coverage: 0.5, model: "onconnect-templates", ms: 1, err: null }))); expect(buildPaper({ ...empty, runs }).body).toMatch(/template engine because the language model was unavailable/); });
  it("reports memory results when present", () => { const m: MemRun[] = Array.from({ length: 6 }, (_, k) => ({ q: "q", age: "9-11" as const, cond: k % 2 ? "carried" as const : "reset" as const, g1: 6, g3: k % 2 ? 4 + k * 0.1 : 6.5 + k * 0.1, w1: 80, w3: 70, model: "m", err: null })); expect(buildPaper({ ...empty, mruns: m }).body).toMatch(/Memory carried: mean change/); });
  it("counts words", () => { expect(wordCount("a b  c\nd")).toBe(4); });
});
