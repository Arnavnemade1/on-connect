import { describe, it, expect } from "vitest";
import { blockRandomise, latinSquare, rng } from "@/lib/protocol";
import { nPaired } from "@/lib/stats";

describe("block randomisation", () => {
  it("is reproducible for a given seed and differs across seeds", () => { const a = blockRandomise(40, ["A", "B"], 4, [], 7), b = blockRandomise(40, ["A", "B"], 4, [], 7), c = blockRandomise(40, ["A", "B"], 4, [], 8); expect(a).toEqual(b); expect(a.map(x => x.arm).join("")).not.toBe(c.map(x => x.arm).join("")); });
  it("balances arms exactly within every complete block", () => { const a = blockRandomise(40, ["A", "B"], 4, [], 1); for (let b = 1; b <= 10; b++) expect(a.filter(x => x.block === b && x.arm === "A").length).toBe(2); expect(a.filter(x => x.arm === "A").length).toBe(20); });
  it("balances within strata", () => { const a = blockRandomise(48, ["A", "B"], 4, ["x", "y", "z"], 3); for (const s of ["x", "y", "z"]) { const g = a.filter(r => r.stratum === s); expect(Math.abs(g.filter(r => r.arm === "A").length - g.filter(r => r.arm === "B").length)).toBeLessThanOrEqual(0); } });
  it("rejects bad block sizes", () => { expect(() => blockRandomise(10, ["A", "B", "C"], 4, [], 1)).toThrow(); });
});
describe("latin square", () => { it.each([2, 3, 4, 6])("n=%i: each condition appears once per row and column", n => { const L = latinSquare(n); for (let i = 0; i < n; i++) { expect(new Set(L[i]).size).toBe(n); expect(new Set(L.map(r => r[i])).size).toBe(n); } });
  it("even n is balanced for immediate carry-over", () => { const L = latinSquare(4); const pairs = new Set<string>(); L.forEach(r => r.slice(1).forEach((v, i) => pairs.add(`${r[i]}>${v}`))); expect(pairs.size).toBe(12); }); });
describe("misc", () => { it("rng is in [0,1)", () => { const r = rng(1); for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); } });
  it("paired designs need fewer participants than between for the same d", () => { expect(nPaired(0.5)).toBeLessThan(64); expect(nPaired(0.5)).toBeGreaterThan(30); }); });
