import { describe, expect, it } from "vitest";
import { GUIDELINES, GREF_BY_KEY, SITUATIONS, guidanceFor, guidancePrompt, wordingCheck } from "@/lib/guidelines";
import { LEVELS, TOPICS } from "@/lib/content";
import { respond, DEFAULT_PROFILE } from "@/lib/engine";

describe("evidence matrix (spec 22.3)", () => {
  it("has exactly one row per profile × situation and five cross-cutting rows", () => {
    for (const l of LEVELS) for (const s of SITUATIONS) expect(GUIDELINES.filter(g => g.age === l && g.topic === s.id), `${l} ${s.id}`).toHaveLength(1);
    expect(GUIDELINES.filter(g => g.crossCutting)).toHaveLength(5); expect(GUIDELINES).toHaveLength(50);
  });
  it("every row has a rule, an example, a source and known references", () => {
    for (const g of GUIDELINES) { expect(g.rule.length, g.id).toBeGreaterThan(80); expect(g.example.length, g.id).toBeGreaterThan(20); expect(g.refs.length, g.id).toBeGreaterThan(0); for (const r of g.refs) expect(GREF_BY_KEY[r], `${g.id} → ${r}`).toBeDefined(); }
  });
  it("journal references carry a DOI; cells without specific evidence say so", () => {
    for (const r of Object.values(GREF_BY_KEY)) if (r.verified === "crossref") expect(r.doi).toMatch(/^10\./);
    expect(GUIDELINES.filter(g => g.noSpecificEvidence).every(g => g.topic === "embolization" || g.topic === "ablation")).toBe(true);
  });
  it("every topic in the app maps to a matrix cell", () => { for (const t of TOPICS) for (const l of LEVELS) expect(guidanceFor(l, t.id).some(g => !g.crossCutting), `${l} ${t.id}`).toBe(true); });
  it("adds cross-cutting rows only when they apply", () => {
    const plain = guidanceFor("3-5", "mri").map(g => g.topic); expect(plain).toEqual(expect.arrayContaining(["mri", "scope", "teachback"])); expect(plain).not.toContain("emotions");
    expect(guidanceFor("3-5", "mri", { emotion: true, caregiver: true }).map(g => g.topic)).toEqual(expect.arrayContaining(["emotions", "caregivers"]));
  });
  it("puts the avoid list into the prompt", () => { expect(guidancePrompt(guidanceFor("3-5", "ct"))).toMatch(/"dye \(sounds like die\)"/); });
  it("catches avoided words for the right age only", () => {
    expect(wordingCheck("We will put you to sleep for a bit.", guidanceFor("3-5", "biopsy")).map(h => h.phrase)).toContain("put you to sleep");
    expect(wordingCheck("The doctors use a special dye.", guidanceFor("3-5", "ct"))).toHaveLength(1);
    expect(wordingCheck("Contrast, sometimes called dye, helps the pictures.", guidanceFor("16-18", "ct"))).toHaveLength(0);
    expect(wordingCheck("Everything will be fine, be brave!", guidanceFor("9-12", null, { emotion: true }))).toHaveLength(2);
  });
});

describe("built-in explanations follow the matrix", () => {
  for (const l of LEVELS) for (const t of TOPICS) it(`${l} ${t.id}`, () => {
    const r = respond(`What is ${t.title.toLowerCase()}?`, { ...DEFAULT_PROFILE, age: l }, null);
    expect(wordingCheck(r.text, guidanceFor(r.plan?.level ?? l, t.id)).map(h => `“${h.match}” (${h.id})`)).toEqual([]);
  });
});
