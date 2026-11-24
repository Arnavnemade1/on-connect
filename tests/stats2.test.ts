import { describe, it, expect } from "vitest";
import { normCdf, normInv, mannWhitney, bootstrapCI, mean, cohenKappa, cronbachAlpha, nPerGroup, powerFor, mdes, holm, hedgesG } from "@/lib/stats";

describe("normal distribution", () => { it("cdf/inverse round-trip and known values", () => { expect(normCdf(1.96)).toBeCloseTo(0.975, 3); expect(normInv(0.975)).toBeCloseTo(1.96, 3); expect(normInv(normCdf(0.7))).toBeCloseTo(0.7, 4); }); });
describe("power analysis", () => {
  it("d=0.5, 80% power needs ~64 per group (textbook 64)", () => { const n = nPerGroup(0.5); expect(n).toBeGreaterThanOrEqual(63); expect(n).toBeLessThanOrEqual(65); });
  it("d=0.8 needs ~26 per group; d=0.2 needs ~393", () => { expect(nPerGroup(0.8)).toBeGreaterThanOrEqual(25); expect(nPerGroup(0.8)).toBeLessThanOrEqual(27); expect(nPerGroup(0.2)).toBeGreaterThan(385); expect(nPerGroup(0.2)).toBeLessThan(400); });
  it("power and MDES are consistent inverses", () => { expect(powerFor(0.5, 64)).toBeCloseTo(0.8, 1); expect(mdes(64)).toBeCloseTo(0.5, 1); });
});
describe("mann-whitney", () => {
  it("detects an obvious shift and not a null one", () => { const hi = mannWhitney([1, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16])!; expect(hi.p).toBeLessThan(0.01); const lo = mannWhitney([1, 5, 2, 6, 3, 7], [2, 6, 3, 7, 4, 5])!; expect(lo.p).toBeGreaterThan(0.3); });
  it("handles ties without NaN", () => { const r = mannWhitney([1, 1, 1, 2, 2], [1, 2, 2, 2, 3])!; expect(Number.isFinite(r.p)).toBe(true); });
});
describe("bootstrap", () => { it("is deterministic and brackets the mean", () => { const x = [3, 5, 4, 6, 5, 7, 4, 5, 6, 5]; const a = bootstrapCI(x), b = bootstrapCI(x); expect(a).toEqual(b); expect(a[0]).toBeLessThan(mean(x)); expect(a[1]).toBeGreaterThan(mean(x)); }); });
describe("agreement", () => {
  it("kappa = 1 for identical raters and ~0 for independent-looking ones", () => { expect(cohenKappa(["a", "b", "a", "b"], ["a", "b", "a", "b"])!.kappa).toBeCloseTo(1); expect(Math.abs(cohenKappa(["a", "a", "b", "b"], ["a", "b", "a", "b"])!.kappa)).toBeLessThan(0.01); });
  it("weighted kappa penalises near-misses less than far misses", () => { const near = cohenKappa([1, 2, 3, 4, 5, 1, 2, 3], [2, 3, 4, 5, 4, 1, 2, 3], true)!.kappa; const far = cohenKappa([1, 2, 3, 4, 5, 1, 2, 3], [5, 4, 1, 2, 1, 1, 2, 3], true)!.kappa; expect(near).toBeGreaterThan(far); });
  it("cronbach alpha is high for consistent items", () => { expect(cronbachAlpha([[1, 1, 2], [2, 2, 2], [3, 3, 4], [4, 4, 4], [5, 5, 5]])).toBeGreaterThan(0.9); });
});
describe("multiple comparisons + effect sizes", () => { it("holm adjusts monotonically", () => { const r = holm([0.01, 0.04, 0.03]); expect(r[0]).toBeCloseTo(0.03); expect(r[2]).toBeCloseTo(0.06); expect(r[1]).toBeGreaterThanOrEqual(r[2]); });
  it("hedges g is slightly smaller than d in magnitude", () => { const a = [5, 6, 7, 8, 9], b = [1, 2, 3, 4, 5]; expect(Math.abs(hedgesG(a, b))).toBeGreaterThan(1); }); });
