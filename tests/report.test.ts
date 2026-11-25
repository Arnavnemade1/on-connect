import { describe, expect, it } from "vitest";
import { buildReport, fmt, reportMarkdown } from "@/lib/report";
import { DEFAULT_PROFILE, respond } from "@/lib/engine";
import { DEFAULT_MEMORY } from "@/lib/memory";
import { metrics } from "@/lib/metrics";
import type { Msg } from "@/lib/store";

function convo(): Msg[] {
  const q1 = respond("what is an mri", DEFAULT_PROFILE, null, DEFAULT_MEMORY); const q2 = respond("I don't get it, explain simpler", DEFAULT_PROFILE, q1.topicId, q1.memory);
  const withM = (r: typeof q1) => ({ ...r, metrics: metrics(r.text), model: "onconnect-templates" });
  return [{ id: "u1", role: "user", text: "what is an mri" }, { id: "b1", role: "bot", text: q1.text, reply: withM(q1) }, { id: "u2", role: "user", text: "I don't get it, explain simpler" }, { id: "b2", role: "bot", text: q2.text, reply: withM(q2), feedback: "simpler" }];
}

describe("buildReport", () => {
  const d = buildReport(convo(), DEFAULT_PROFILE);
  it("pairs each answer with the question that prompted it", () => { expect(d.turns.map(t => t.question)).toEqual(["what is an mri", "I don't get it, explain simpler"]); });
  it("counts only what was measured", () => { expect(d.turns).toHaveLength(2); expect(d.graded).toBe(2); expect(d.within).toBeLessThanOrEqual(d.graded); expect(d.asked).toBe(2); });
  it("records the memory moving after a confusion signal", () => { expect(d.turns[1].signals.length).toBeGreaterThan(0); expect(d.end.levelShift).toBeLessThanOrEqual(d.start.levelShift); });
  it("flags template-engine answers honestly", () => { expect(d.offlineTurns).toBe(2); expect(d.models).toEqual(["onconnect-templates"]); });
  it("writes a headline from measured facts only", () => { expect(d.headline).toMatch(/2 answers on mri/i); expect(d.headline).toMatch(/of 2 landed within two grades/); });
  it("keeps feedback counts", () => { expect(d.feedback).toEqual({ simpler: 1 }); });
  it("skips the grade check for non-English answers", () => {
    const m = convo(); m[1].reply!.lang = "es"; expect(buildReport(m, DEFAULT_PROFILE).turns[0].grade).toBeNull();
  });
  it("is empty and safe with no replies", () => { const e = buildReport([{ id: "u", role: "user", text: "hi" }], DEFAULT_PROFILE); expect(e.turns).toEqual([]); expect(e.meanGap).toBeNull(); });
});
describe("formatting and export", () => {
  it("formats signed numbers", () => { expect(fmt(2)).toBe("+2"); expect(fmt(-1)).toBe("−1"); expect(fmt(0)).toBe("0"); });
  it("exports a markdown table with limits stated", () => { const md = reportMarkdown(buildReport(convo(), DEFAULT_PROFILE), "t"); expect(md).toMatch(/\| Reply \| Topic/); expect(md).toMatch(/not a clinical measure|Neither is a clinical measure/); expect(md).toMatch(/template engine/); });
});
