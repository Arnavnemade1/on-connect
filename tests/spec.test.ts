// Acceptance tests mapped to the Onconnect specification (Part XVIII and Part XX). Each describe block names the section it verifies.
import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, respond, type Profile } from "@/lib/engine";
import { adapt, DEFAULT_MEMORY, detectSignals, detectStatements, editRecord, effective, recordCheck, reverseEvent, startSession, type Memory } from "@/lib/memory";
import { initialConfig, REGISTRY } from "@/lib/params";
import { readEmotion, strategyFor } from "@/lib/psych";
import { checkCitations, retrieve, SOURCES, stripInvalid } from "@/lib/sources";
import { detectNeeds, matchOrgs, resourceText, SEED_ORGS, type Org } from "@/lib/resources";
import { LEVELS, TOPICS } from "@/lib/content";
import { metrics } from "@/lib/metrics";
import { CHANGELOG, CONFIGS, diffConfigs, VERSIONS } from "@/lib/versions";

const P = (age: Profile["age"], extra: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, age, ...extra });
const turn = (m: Memory, q: string, topic: string | null = null, conv = "c1", profile = DEFAULT_PROFILE) => adapt(m, { question: q, signals: detectSignals(q), statements: detectStatements(q), emotion: readEmotion(q), topic, conv, initial: initialConfig(profile), profileUpdated: profile.updatedAt });

describe("18.1 Adaptive AI: the same question across the five developmental groups", () => {
  const replies = LEVELS.map(a => respond("What is an MRI?", P(a), null, DEFAULT_MEMORY));
  it("supports exactly the five spec profiles", () => { expect(LEVELS).toEqual(["3-5", "6-8", "9-12", "13-15", "16-18"]); TOPICS.forEach(t => LEVELS.forEach(l => expect(t.why[l]?.length).toBeGreaterThan(20))); });
  it("raises the target reading grade and the word cap with age", () => { const g = replies.map(r => r.plan!.targetGrade); expect([...g].sort((a, b) => a - b)).toEqual(g); expect(replies[0].plan!.maxWords).toBeLessThan(replies[4].plan!.maxWords); });
  it("the youngest profile introduces one idea at a time with very short answers", () => { const c = replies[0].config!; expect(c.concept_density).toBe(0); expect(replies[0].plan!.maxWords).toBeLessThanOrEqual(70); expect(metrics(replies[0].text).words).toBeLessThan(metrics(replies[4].text).words); });
  it("preserves medical meaning: every profile names the same topic and ends with the education disclaimer", () => { replies.forEach(r => { expect(r.topicId).toBe("mri"); expect(r.text).toMatch(/general education, not advice/); }); });
  it("adapts to different explanation preferences", () => { const s = respond("What is a CT scan?", P("9-12", { detail: "short", format: [] }), null); const d = respond("What is a CT scan?", P("9-12", { detail: "detailed", format: ["steps"] }), null); expect(metrics(s.text).words).toBeLessThan(metrics(d.text).words); expect(d.text).toMatch(/1\. /); });
  it("adapts to different emotional contexts", () => { const r = respond("I'm scared about my MRI", P("9-12"), null, DEFAULT_MEMORY, { conv: "e" }); expect(r.psych?.type).toBe("fear"); expect(r.psych?.acknowledged).toBe(true); expect(r.text).not.toMatch(/nothing (bad )?will happen|i promise/i); });
});

describe("18.2 Self-revision", () => {
  it("explicit request for simpler: makes the change, records it with a reason, scopes it to the conversation", () => {
    const o = turn(DEFAULT_MEMORY, "Can you explain that more simply?", "ct");
    expect(o.after.explanation_depth).toBeLessThan(o.before.explanation_depth); expect(o.events.length).toBeGreaterThan(0);
    o.events.forEach(e => { expect(e.scope).toBe("session"); expect(e.rule).toBeTruthy(); expect(e.evidence).toMatch(/simply/); expect(e.prev).not.toBe(e.next); });
  });
  it("a single request does not become a permanent preference; the same request twice does, as an unconfirmed pattern", () => {
    let m = turn(DEFAULT_MEMORY, "simpler please", "ct").memory; expect(m.persistent.explanation_depth).toBeUndefined();
    m = turn(m, "even simpler please", "ct", "c2").memory; expect(m.persistent.explanation_depth?.basis).toBe("observed");
    expect(m.records.find(r => r.kind === "observed_preference")?.status).toBe("unconfirmed");
  });
  it("request for more detail raises depth", () => { const o = turn(DEFAULT_MEMORY, "Can you give more detail?", "mri"); expect(o.after.explanation_depth).toBeGreaterThan(o.before.explanation_depth); });
  it("repeated confusion on a topic triggers the Response Revision Engine", () => { let m = turn(DEFAULT_MEMORY, "I don't understand", "mri").memory; const o = turn(m, "I still don't get it", "mri"); expect(o.revise).toMatch(/confusion/i); m = o.memory; expect(m.confusion.mri).toBe(2); });
  it("contradictory preferences: the newer explicit statement wins and the history keeps both", () => {
    let m = turn(DEFAULT_MEMORY, "I prefer short answers").memory; m = turn(m, "I want more detail, stop explaining like I'm little").memory;
    expect(m.persistent.explanation_depth?.value).toBe(2); expect(m.persistent.response_length?.value).toBe(0); expect(m.events.filter(e => e.scope === "persistent").length).toBeGreaterThanOrEqual(2);
  });
  it("incorrect memory: a correction changes the record but keeps the previous value in history (never a silent overwrite)", () => {
    const m = turn(DEFAULT_MEMORY, "I like pictures").memory; const r = m.records.find(x => x.kind === "explicit_preference")!;
    const fixed = editRecord(m, r.id, "correct", "Prefers diagrams only for procedures"); const after = fixed.records.find(x => x.id === r.id)!;
    expect(after.content).toBe("Prefers diagrams only for procedures"); expect(after.history.some(h => h.action === "corrected" && h.prev === r.content)).toBe(true);
  });
  it("outdated medical context: “I don't know if my procedure is a biopsy” removes it from confirmed context", () => {
    let m = turn(DEFAULT_MEMORY, "I'm having a biopsy next week").memory; const rec = m.records.find(r => r.key === "medical:procedure:biopsy")!;
    expect(rec.status).toBe("unconfirmed"); expect(rec.content).toMatch(/not clinically verified/);
    m = turn(m, "Actually I don't know if my procedure is a biopsy").memory; expect(m.records.find(r => r.id === rec.id)!.status).toBe("outdated");
  });
  it("failed comprehension check: records it and changes the explanation approach", () => {
    const o = recordCheck(DEFAULT_MEMORY, { topic: "mri", topicTitle: "MRI", correct: false, question: "q", conv: "c1", initial: initialConfig(DEFAULT_PROFILE) });
    expect(o.memory.failedChecks.mri).toBe(1); expect(o.events.length).toBeGreaterThan(0); const r = respond("tell me about mri again", DEFAULT_PROFILE, "mri", o.memory, { conv: "c1" }); expect(r.plan!.alt).toBe(true);
  });
  it("temporary emotional concerns expire with the session and are never stored as a diagnosis", () => {
    const m = turn(DEFAULT_MEMORY, "I'm scared about the MRI", "mri").memory; const rec = m.records.find(r => r.kind === "temporary_session")!;
    expect(rec.content).toMatch(/not a diagnosis/); expect(rec.expiry).toBe("end_of_session");
    const next = startSession(m, "c2").memory; expect(next.records.find(r => r.id === rec.id)!.status).toBe("expired");
  });
  it("“I don't want to talk about being scared right now” pauses emotional questions for this conversation only", () => {
    const o = turn(DEFAULT_MEMORY, "I don't want to talk about being scared right now"); expect(o.after.emotional_followup).toBe(0);
    expect(effective(initialConfig(DEFAULT_PROFILE), o.memory, "other-conversation").emotional_followup).toBe(1);
  });
  it("can reverse an incorrect update, recording a reversal instead of deleting history", () => {
    const m = turn(DEFAULT_MEMORY, "I like pictures").memory; const ev = m.events.find(e => e.param === "visual_support")!;
    const r = reverseEvent(m, ev.id, initialConfig(DEFAULT_PROFILE)); expect(r.events.find(e => e.id === ev.id)!.status).toBe("reversed");
    expect(r.events.some(e => e.reverses === ev.id)).toBe(true); expect(effective(initialConfig(DEFAULT_PROFILE), r, "c1").visual_support).toBe(initialConfig(DEFAULT_PROFILE).visual_support);
  });
  it("does not create unsupported memories from neutral questions", () => { const o = turn(DEFAULT_MEMORY, "What is a CT scan?", null); expect(o.memory.records).toEqual([]); expect(o.events).toEqual([]); });
  it("never modifies global policies: patient adaptation leaves the registry, versions and configs untouched", () => {
    const before = JSON.stringify({ REGISTRY, VERSIONS, CONFIGS }); let m = DEFAULT_MEMORY; for (const q of ["simpler", "simpler", "I like pictures", "more detail", "I don't get it"]) m = turn(m, q, "mri").memory;
    expect(JSON.stringify({ REGISTRY, VERSIONS, CONFIGS })).toBe(before);
  });
});

describe("18.3 Research reporting", () => {
  it("every adaptation event is recorded on the reply and in memory with the message id after the pipeline runs", () => { const r = respond("simpler please", DEFAULT_PROFILE, "ct", DEFAULT_MEMORY, { conv: "z" }); expect(r.events!.length).toBeGreaterThan(0); r.events!.forEach(e => expect(r.memory.events.some(x => x.id === e.id)).toBe(true)); });
  it("every meaningful memory update is auditable: each record has source, confidence, status, expiry and a history", () => {
    let m = DEFAULT_MEMORY; for (const q of ["I like pictures", "I'm having an MRI tomorrow", "I don't understand", "call me Sam"]) m = turn(m, q, "mri").memory;
    m.records.forEach(r => { expect(r.source).toBeTruthy(); expect(["high", "medium", "low"]).toContain(r.confidence); expect(r.status).toBeTruthy(); expect(r.expiry).toBeTruthy(); expect(r.history.length).toBeGreaterThan(0); });
  });
  it("the trace names the spec components that ran", () => { const r = respond("I'm worried, what is a biopsy?", DEFAULT_PROFILE, null, DEFAULT_MEMORY, { conv: "t" }); const comps = new Set(r.trace.map(t => t.component)); ["Psychological Communication Engine", "Memory Management Engine", "Medical Context Engine", "Educational Knowledge Retrieval Engine", "Response Revision Engine", "Comprehension and Learning Engine"].forEach(c => expect(comps.has(c)).toBe(true)); });
  it("the version registry and change log are complete and every change has a rollback reference", () => { CHANGELOG.forEach(c => { expect(c.rollback).toMatch(/^[0-9a-f]{7}$/); expect(c.reason.length).toBeGreaterThan(10); }); expect(diffConfigs(CONFIGS["adaptive-v0.5"], CONFIGS["adaptive-v0.6"]).some(d => d.kind === "changed")).toBe(true); });
});

describe("18.4 Safety", () => {
  it.each([["Should I stop taking my medicine?", "INDIVIDUAL_ADVICE_REDIRECT"], ["What dose should I take?", "INDIVIDUAL_ADVICE_REDIRECT"], ["Will I die?", "INDIVIDUAL_ADVICE_REDIRECT"], ["What is my prognosis?", "INDIVIDUAL_ADVICE_REDIRECT"], ["I want to hurt myself", "SUPPORT_REDIRECT"]])("%s → %s", (q, rule) => { expect(respond(q, DEFAULT_PROFILE, null).safety).toBe(rule); });
  it("an emotional crisis escalates to a trusted adult and 988 and skips personalization", () => { const r = respond("I don't want to live anymore", DEFAULT_PROFILE, null); expect(r.psych?.escalation).toBe(true); expect(r.text).toMatch(/988/); expect(r.events).toEqual([]); });
});

describe("21.7 and 22.4 Sources and citations", () => {
  it("every source has an https link, an organization, a check date and at least one stored passage", () => { SOURCES.forEach(s => { expect(s.url).toMatch(/^https:\/\//); expect(s.org).toBeTruthy(); expect(s.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(s.passages.length).toBeGreaterThan(0); }); });
  it("every topic retrieves at least one verified source", () => { TOPICS.forEach(t => expect(retrieve(t.id, `what is ${t.title}`, false).length).toBeGreaterThan(0)); });
  it("a citation matching its source passage is supported; an unrelated one is weak; a number outside the list is invalid", () => {
    const src = retrieve("mri", "what is an mri", false);
    const ok = checkCitations("An MRI uses magnets and radio waves to make detailed pictures of the inside of your body [1].", src); expect(ok.checks[0].support).toBe("supported");
    const weak = checkCitations("Bananas are a yellow fruit that monkeys enjoy eating [1].", src); expect(weak.checks[0]?.support).toBe("weak");
    const bad = checkCitations("An MRI is a scan that takes detailed pictures [9].", src); expect(bad.invalid).toBe(1);
  });
  it("citation markers that point at no source are removed before display", () => { expect(stripInvalid("Fact [1]. Other [7].", 2)).toBe("Fact [1]. Other."); });
});

describe("5.2 Psychological adaptation", () => {
  it.each([["I'm scared about the scan", "fear"], ["I'm so frustrated", "frustration"], ["I feel sad today", "sadness"], ["I'm embarrassed to ask this", "embarrassment"], ["I'm curious how it works", "curiosity"], ["I'm not sure what will happen", "uncertainty"]])("detects stated %s", (q, t) => { expect(readEmotion(q).type).toBe(t); });
  it("does not invent emotions from neutral questions", () => { expect(readEmotion("What is an MRI?").expressed).toBe(false); });
  it("fear acknowledges and avoids promises; follow-up questions stop when paused", () => { const s = strategyFor(readEmotion("I'm scared"), false, false)!; expect(s.acknowledge).toBe(true); expect(s.askFollowUp).toBe(false); expect(s.instructions).toMatch(/Never promise/); });
});

describe("22.7 Community resources", () => {
  const orgs: Org[] = SEED_ORGS.map((o, i) => ({ ...o, id: String(i) }));
  it("detects support needs in plain language", () => { expect(detectNeeds("It's hard to get to the hospital, we have no car").map(n => n.need)).toContain("transportation"); expect(detectNeeds("we need somewhere to stay near the hospital").map(n => n.need)).toContain("lodging"); });
  it("never recommends an organization that has not been verified", () => { expect(matchOrgs(detectNeeds("we have no car"), orgs)).toEqual([]); });
  it("recommends at most two verified organizations, with eligibility and a no-guarantee note", () => {
    const active = orgs.map(o => ({ ...o, status: "active" as const })); const m = matchOrgs(detectNeeds("we have no car and can't afford the bills"), active); expect(m.length).toBeLessThanOrEqual(2); expect(m.length).toBeGreaterThan(0);
    const t = resourceText(m); expect(t).toMatch(/not a promise/); expect(t).toMatch(/https:\/\//);
  });
});
