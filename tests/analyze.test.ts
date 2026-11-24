import { describe, it, expect } from "vitest";
import { compare, groupsFrom, parseCsv } from "@/lib/analyze";
describe("csv + grouping", () => {
  it("parses quoted fields, escaped quotes and CRLF", () => { const c = parseCsv('group,score,note\r\na,1,"hi, there"\r\nb,2,"say ""x"""\r\n'); expect(c.header).toEqual(["group", "score", "note"]); expect(c.rows[0][2]).toBe("hi, there"); expect(c.rows[1][2]).toBe('say "x"'); });
  it("groups numeric values and skips blanks / non-numbers", () => { const g = groupsFrom([["a", "1"], ["a", ""], ["b", "x"], ["b", "3"], ["a", "2"]], 0, 1); expect(g.find(x => x.name === "a")!.values).toEqual([1, 2]); expect(g.find(x => x.name === "b")!.values).toEqual([3]); });
});
describe("compare", () => { it("reports a clear difference with consistent effect sizes", () => { const r = compare({ name: "x", values: [8, 9, 7, 8, 9, 10, 8] }, { name: "y", values: [4, 5, 6, 5, 4, 6, 5] }); expect(r.w!.p).toBeLessThan(0.001); expect(r.g).toBeGreaterThan(2); expect(r.mw!.p).toBeLessThan(0.01); expect(r.a.mean).toBeGreaterThan(r.b.mean); }); });
