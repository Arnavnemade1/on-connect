import { describe, it, expect } from "vitest";
import { mapAge, migrateConvos } from "@/lib/migrate";
import { migrateMemory } from "@/lib/memory";
import { summarise, type Run } from "@/lib/eval";

describe("storage migration", () => {
  it("fills in memory/trace on replies saved before they existed (the levelShift crash)", () => {
    const old = [{ id: "c", title: "t", ts: "x", msgs: [{ id: "1", role: "user", text: "hi" }, { id: "2", role: "bot", text: "yo", reply: { text: "yo", topicId: null, memory: { levelShift: -1 } } }] }];
    const [c] = migrateConvos(old) as { msgs: { reply?: { memory: { schema: number; records: unknown[] }; trace: unknown[] } }[] }[];
    expect(c.msgs[1].reply!.memory.schema).toBe(3); expect(c.msgs[1].reply!.memory.records).toEqual([]); expect(c.msgs[1].reply!.trace).toEqual([]);
  });
  it("maps the old four age bands onto the five spec profiles", () => { expect(mapAge("9-11")).toBe("9-12"); expect(mapAge("12-14")).toBe("13-15"); expect(mapAge("15-17")).toBe("16-18"); expect(mapAge("6-8")).toBe("6-8"); expect(mapAge("3-5")).toBe("3-5"); });
  it("carries learned counts forward from an old memory", () => { const m = migrateMemory({ levelShift: -1, confusion: { mri: 2 }, turns: 7 }); expect(m.schema).toBe(3); expect(m.confusion.mri).toBe(2); expect(m.turns).toBe(7); expect(m.events).toEqual([]); });
  it("drops garbage and survives non-arrays", () => { expect(migrateConvos(null)).toEqual([]); expect(migrateConvos([null, { msgs: "x" }, { msgs: [null, { text: 5 }] }])).toEqual([{ msgs: [] }]); });
  it("is idempotent", () => { const once = migrateConvos([{ msgs: [{ role: "bot", text: "a", reply: {} }] }]); expect(migrateConvos(once)).toEqual(once); });
});

describe("evaluation summary", () => {
  const mk = (cond: "adaptive" | "baseline", age: Run["age"], grade: number, i: number): Run => ({ id: String(i), q: "q", topic: true, age, cond, grade, words: 100, coverage: 0.5, model: "m", ms: 1, err: null });
  it("shows adaptive closer to target than a flat control and ignores failed runs", () => {
    const runs: Run[] = []; let i = 0; const T = { "3-5": 1.5, "6-8": 3, "9-12": 5.5, "13-15": 8, "16-18": 11 } as const;
    for (const a of Object.keys(T) as Run["age"][]) for (let k = 0; k < 6; k++) { runs.push(mk("adaptive", a, T[a] + (k % 3) - 1, i++)); runs.push(mk("baseline", a, 8 + (k % 3) - 1, i++)); }
    runs.push({ ...mk("adaptive", "6-8", 99, i++), err: "HTTP 500" });
    const s = summarise(runs); expect(s.adaptive.err).toBeLessThan(s.baseline.err); expect(s.tErr!.p).toBeLessThan(0.05); expect(s.failed).toBe(1);
    expect(s.perAge[0].adaptive).toBeLessThan(s.perAge[4].adaptive); expect(Math.abs(s.perAge[0].baseline - s.perAge[4].baseline)).toBeLessThan(0.5);
  });
});
