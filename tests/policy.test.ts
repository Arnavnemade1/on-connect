import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { POLICY_TABLE } from "@/lib/memory";
// Every rule id used in the policy code must be documented in the published table (spec 8.3: every adaptation has a reason).
describe("policy documentation", () => {
  const src = readFileSync("lib/memory.ts", "utf8").split("export const POLICY_TABLE")[0];
  const used = [...new Set([...src.matchAll(/"([RSEC]\d) /g)].map(m => m[1]))];
  const documented = POLICY_TABLE.flatMap(p => { const m = p.id.match(/^([RSEC])(\d)(?:–[RSEC]?(\d))?$/); if (!m) return []; const a = +m[2], b = m[3] ? +m[3] : a; return Array.from({ length: b - a + 1 }, (_, i) => `${m[1]}${a + i}`); });
  it("uses rule ids", () => { expect(used.length).toBeGreaterThan(10); });
  it.each(used)("%s is documented", id => { expect(documented).toContain(id); });
});
