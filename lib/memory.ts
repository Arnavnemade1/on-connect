// Memory Management Engine (spec Part VII, 22.2) and the adaptation policy that drives self-revision (Part VIII).
// Design rules taken from the spec:
//  - Explicit statements are kept apart from inferences. One request is session-only; a repeated pattern becomes a
//    persistent "observed" preference with medium confidence that still needs confirmation.
//  - Emotions are temporary session context and never a diagnosis.
//  - Medical context from the reader is stored as user-provided and unverified, never inferred.
//  - Nothing is silently overwritten: every record keeps its history, every parameter change is an event with a reason,
//    and every event can be reversed.
import { REGISTRY, clampParam, label, PARAM, type Component, type Config, type ParamId } from "./params";
import type { EmotionRead } from "./psych";

export const POLICY_VERSION = "adapt-policy-1.0";
export const MEMORY_SCHEMA = 3;

// ------------------------------------------------------------------ signals (what the reader asks for in this turn)
export type Signal = "CONFUSED" | "SIMPLER" | "MORE_DETAIL" | "SHORTER" | "LONGER" | "UNDERSTOOD" | "WANTS_EXAMPLE" | "WANTS_STEPS";
const R = {
  MORE: /(too (simple|basic|easy|short|childish)|more (detail|detailed|complex|technical|advanced)|tell me more|elaborate|go deeper|in more depth|expand on)/i,
  CONF: /(don'?t (really )?(understand|get)|do not understand|confus|doesn'?t make sense|what do you mean|\bhuh\b|lost me|i'?m lost|makes no sense|unclear|still don'?t)/i,
  SIMP: /(simpler|more simply|explain (it |that |this )?simply|simple terms|easier|too (hard|complex|complicated|difficult|technical|long words)|dumb (it )?down|like i'?m (5|five)|eli5|plain (words|english))/i,
  SHORT: /(shorter|too long|too much|be brief|briefly|tl;?dr|summari[sz]e|quick(er)? (answer|version)|in a sentence)/i,
  LONG: /(longer|full explanation|in depth|thorough|too short|more information|more info)/i,
  OK: /(got it|i (get|understand) (it|now)|makes sense|that helps|clear now|okay i see|ok i see)/i,
  EX: /(example|analogy|like what|for instance)/i,
  STEP: /(step by step|steps|walk me through|in order)/i,
};
export function detectSignals(q: string): Signal[] {
  const out = new Set<Signal>(); let s = q;
  if (R.MORE.test(s)) { out.add("MORE_DETAIL"); s = s.replace(R.MORE, " "); }
  if (R.CONF.test(s)) { out.add("CONFUSED"); s = s.replace(R.CONF, " "); }
  if (R.SIMP.test(s)) out.add("SIMPLER");
  if (R.SHORT.test(s)) out.add("SHORTER");
  if (R.LONG.test(s) && !out.has("MORE_DETAIL")) out.add("LONGER");
  if (R.OK.test(s) && !out.has("CONFUSED")) out.add("UNDERSTOOD");
  if (R.EX.test(s)) out.add("WANTS_EXAMPLE");
  if (R.STEP.test(s)) out.add("WANTS_STEPS");
  return [...out];
}

// ------------------------------------------------------------------ lasting statements (explicit preferences and context)
export type StatementKind = "PREFERS_VISUAL" | "PREFERS_DETAIL" | "PREFERS_SIMPLE" | "PREFERS_SHORT" | "PREFERS_EXAMPLES" | "PREFERS_DEFINITIONS" | "PREFERS_STEPS" | "PREFERRED_NAME" | "HAS_PROCEDURE" | "UNSURE_PROCEDURE";
export interface Statement { kind: StatementKind; value?: string; quote: string; }
const PROCS = ["biopsy", "mri", "ct scan", "ct", "ultrasound", "blood test", "catheter", "port", "embolization", "ablation"];
const PROC_ID: Record<string, string> = { "ct scan": "ct", ct: "ct", mri: "mri", biopsy: "biopsy", ultrasound: "ultrasound", "blood test": "bloodtest", catheter: "catheter", port: "catheter", embolization: "embolization", ablation: "ablation" };
const ST: [StatementKind, RegExp][] = [
  ["PREFERS_VISUAL", /\b(i (understand|learn|get it) better (when|with|if) you (show|draw|use) (me )?(pictures|diagrams|drawings|images)|i (like|prefer|want) (pictures|diagrams|drawings|visuals)|show me pictures)\b/i],
  ["PREFERS_DETAIL", /\b(stop explaining (things )?like i'?m (little|a baby|five|5|a kid)|i want (more|all the|the full) detail|don'?t (talk down|treat me like a (baby|little kid))|i (like|prefer) (detailed|in-depth|technical) (answers|explanations))\b/i],
  ["PREFERS_SIMPLE", /\b(i (like|prefer|want) (things )?(explained )?(in )?(really |very )?simple (words|terms|language|explanations)|(always )?use (simple|easy) words)\b/i],
  ["PREFERS_SHORT", /\b(i (like|prefer|want) (short|brief|quick) (answers|explanations)|keep (it|your answers) short)\b/i],
  ["PREFERS_EXAMPLES", /\b(i (like|prefer|love) examples|examples help me|i (like|prefer) analogies)\b/i],
  ["PREFERS_DEFINITIONS", /\b(please )?(explain|define) (the )?medical words( when you use them)?\b/i],
  ["PREFERS_STEPS", /\b(i (like|prefer|want) (things )?(explained )?step by step|i want to know exactly what will happen)\b/i],
];
export function detectStatements(q: string): Statement[] {
  const out: Statement[] = [];
  for (const [kind, re] of ST) { const m = q.match(re); if (m) out.push({ kind, quote: m[0].slice(0, 120) }); }
  const name = q.match(/\b(?:call me|my name is|i'?m called)\s+([A-Z][a-z]{1,20})\b/); if (name) out.push({ kind: "PREFERRED_NAME", value: name[1], quote: name[0] });
  const pl = q.toLowerCase(); const proc = PROCS.find(p => new RegExp(`\\b${p}\\b`).test(pl));
  if (proc) {
    if (/\b(don'?t|do not|not sure|unsure)\b[^.?!]{0,40}\b(if|whether)\b[^.?!]{0,30}\b(my|the) (procedure|test|scan)\b|\b(i )?(don'?t|do not) know if (my|it'?s|it is)/i.test(q)) out.push({ kind: "UNSURE_PROCEDURE", value: PROC_ID[proc], quote: q.slice(0, 120) });
    else if (/\b(i'?m|i am|i will be|i'?ll be|i have|i'?ve got|i need|my)\b[^.?!]{0,25}\b(having|getting|get|scheduled for|going for|procedure is|test is|scan is|upcoming|next week|tomorrow)\b/i.test(q)) out.push({ kind: "HAS_PROCEDURE", value: PROC_ID[proc], quote: q.slice(0, 120) });
  }
  return out;
}

// ------------------------------------------------------------------ records and events
export type RecordKind = "explicit_preference" | "observed_preference" | "educational_context" | "communication_need" | "temporary_session" | "medical_context" | "profile";
export type RecordStatus = "active" | "unconfirmed" | "outdated" | "corrected" | "expired" | "deleted";
export type RecordSource = "user_statement" | "caregiver_input" | "system_observation" | "teach_back" | "profile_form";
export interface RecordChange { ts: string; action: "created" | "updated" | "confirmed" | "corrected" | "marked_outdated" | "expired" | "deleted" | "restored"; prev: string | null; next: string | null; reason: string; by: "system" | "user"; }
export interface MemoryRecord {
  id: string; kind: RecordKind; key: string; content: string; source: RecordSource; confidence: "high" | "medium" | "low"; status: RecordStatus;
  created: string; lastConfirmed: string; expiry: "end_of_session" | "reconfirm_30d" | "reconfirm_90d" | "never"; sessions: string[]; history: RecordChange[];
}
export type Trigger = "explicit_request" | "explicit_preference" | "repeated_pattern" | "comprehension_check" | "confusion_signal" | "emotional_signal" | "reversal";
export interface AdaptEvent {
  id: string; ts: string; conv: string | null; msg: string | null; param: ParamId; prev: number; next: number; scope: "session" | "persistent";
  trigger: Trigger; evidence: string; rule: string; component: Component; reviewRequired: false; status: "applied" | "reversed" | "expired"; reversedBy?: string; reverses?: string;
}
export interface MemOp { op: "accessed" | "created" | "updated" | "confirmed" | "marked_outdated" | "expired"; id: string; content: string; reason: string; }

export interface Memory {
  schema: 3;
  persistent: Partial<Record<ParamId, { value: number; basis: "explicit" | "observed"; since: string; event: string }>>;
  session: { conv: string | null; values: Partial<Record<ParamId, number>>; started: string };
  counts: Partial<Record<Signal, number>>;      // how many turns contained each request, for the repeated-pattern rule
  confusion: Record<string, number>; understood: Record<string, number>; failedChecks: Record<string, number>;
  records: MemoryRecord[]; events: AdaptEvent[]; turns: number;
}
export const DEFAULT_MEMORY: Memory = { schema: 3, persistent: {}, session: { conv: null, values: {}, started: "" }, counts: {}, confusion: {}, understood: {}, failedChecks: {}, records: [], events: [], turns: 0 };

const id = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const clone = (m: Memory): Memory => ({ ...m, persistent: { ...m.persistent }, session: { ...m.session, values: { ...m.session.values } }, counts: { ...m.counts }, confusion: { ...m.confusion }, understood: { ...m.understood }, failedChecks: { ...m.failedChecks }, records: m.records.map(r => ({ ...r, sessions: [...r.sessions], history: [...r.history] })), events: [...m.events] });

/** The configuration actually used: starting profile, then patterns, then explicit preferences, then this conversation's changes. Explicit profile edits made after an observed pattern win over it. */
export function effective(initial: Config, m: Memory, conv: string | null, profileUpdated = ""): Config {
  const c = { ...initial };
  for (const basis of ["observed", "explicit"] as const) for (const p of REGISTRY) { const o = m.persistent[p.id]; if (o && o.basis === basis && !(basis === "observed" && profileUpdated && profileUpdated > o.since)) c[p.id] = o.value; }
  if (m.session.conv === conv) for (const p of REGISTRY) { const v = m.session.values[p.id]; if (v != null) c[p.id] = v; }
  return c;
}

/** Starting a new conversation expires session-scoped settings and temporary records (spec 22.2). */
export function startSession(mIn: Memory, conv: string | null, ts = new Date().toISOString()): { memory: Memory; expired: MemOp[]; events: AdaptEvent[] } {
  if (mIn.session.conv === conv) return { memory: mIn, expired: [], events: [] };
  const m = clone(mIn); const expired: MemOp[] = [];
  m.events = m.events.map(e => (e.scope === "session" && e.status === "applied" && e.conv === m.session.conv ? { ...e, status: "expired" } : e));
  for (const r of m.records) if (r.expiry === "end_of_session" && r.status !== "expired" && r.status !== "deleted") { r.status = "expired"; r.history.push({ ts, action: "expired", prev: r.content, next: null, reason: "Session ended: temporary context does not carry over", by: "system" }); expired.push({ op: "expired", id: r.id, content: r.content, reason: "temporary session context" }); }
  m.session = { conv, values: {}, started: ts };
  return { memory: m, expired, events: [] };
}

function upsertRecord(m: Memory, ops: MemOp[], ts: string, conv: string | null, key: string, init: Omit<MemoryRecord, "id" | "created" | "lastConfirmed" | "sessions" | "history" | "key">, reason: string) {
  const ex = m.records.find(r => r.key === key && r.status !== "deleted" && r.status !== "expired");
  if (!ex) {
    const r: MemoryRecord = { ...init, id: id("MR"), key, created: ts, lastConfirmed: ts, sessions: conv ? [conv] : [], history: [{ ts, action: "created", prev: null, next: init.content, reason, by: "system" }] };
    m.records.push(r); ops.push({ op: "created", id: r.id, content: r.content, reason }); return r;
  }
  const changed = ex.content !== init.content || ex.confidence !== init.confidence || ex.status !== init.status;
  if (conv && !ex.sessions.includes(conv)) ex.sessions.push(conv);
  ex.lastConfirmed = ts;
  if (changed) { ex.history.push({ ts, action: "updated", prev: ex.content, next: init.content, reason, by: "system" }); Object.assign(ex, { content: init.content, confidence: init.confidence, status: init.status, source: init.source }); ops.push({ op: "updated", id: ex.id, content: ex.content, reason }); }
  else { ex.history.push({ ts, action: "confirmed", prev: null, next: null, reason, by: "system" }); ops.push({ op: "confirmed", id: ex.id, content: ex.content, reason }); }
  return ex;
}

export interface AdaptInput { question: string; signals: Signal[]; statements: Statement[]; emotion: EmotionRead; topic: string | null; topicTitle?: string; conv: string | null; initial: Config; profileUpdated?: string; ts?: string; }
export interface AdaptOutput { memory: Memory; events: AdaptEvent[]; ops: MemOp[]; revise: string | null; before: Config; after: Config; }

/** The adaptation policy: turns what the reader said into recorded, reasoned, reversible parameter changes and memory updates. */
export function adapt(mIn: Memory, inp: AdaptInput): AdaptOutput {
  const ts = inp.ts ?? new Date().toISOString();
  const { memory: m0, expired } = startSession(mIn, inp.conv, ts);
  const m = clone(m0); m.turns += 1;
  const ops: MemOp[] = [...expired]; const events: AdaptEvent[] = [];
  const before = effective(inp.initial, m, inp.conv, inp.profileUpdated);
  const quote = inp.question.replace(/\s+/g, " ").trim().slice(0, 120);
  const cur = () => effective(inp.initial, m, inp.conv, inp.profileUpdated);

  const change = (param: ParamId, to: number, scope: "session" | "persistent", trigger: Trigger, rule: string, basis: "explicit" | "observed" = "explicit", component: Component = PARAM[param].component) => {
    const prev = cur()[param]; const next = clampParam(param, to); if (prev === next && scope === "session") return;
    const ev: AdaptEvent = { id: id("AE"), ts, conv: inp.conv, msg: null, param, prev, next, scope, trigger, evidence: quote, rule, component, reviewRequired: false, status: "applied" };
    if (scope === "session") m.session.values[param] = next;
    else { const old = m.persistent[param]; if (old && old.value === next && old.basis === basis) return; m.persistent[param] = { value: next, basis, since: ts, event: ev.id }; delete m.session.values[param]; }
    events.push(ev); m.events.push(ev);
  };
  const delta = (param: ParamId, d: number, scope: "session" | "persistent", trigger: Trigger, rule: string, basis: "explicit" | "observed" = "explicit", component?: Component) => change(param, cur()[param] + d, scope, trigger, rule, basis, component);

  // 1. per-turn requests: change this conversation only (a single request is not a lasting preference)
  const s = new Set(inp.signals);
  for (const sig of s) m.counts[sig] = (m.counts[sig] ?? 0) + 1;
  if (s.has("SIMPLER")) { delta("explanation_depth", -1, "session", "explicit_request", "R1 simpler → depth −1"); delta("terminology_density", -1, "session", "explicit_request", "R1 simpler → terminology −1"); delta("reading_level", -1, "session", "explicit_request", "R1 simpler → reading level −1"); }
  if (s.has("MORE_DETAIL")) { delta("explanation_depth", +1, "session", "explicit_request", "R2 more detail → depth +1"); delta("terminology_density", +1, "session", "explicit_request", "R2 more detail → terminology +1"); delta("reading_level", +1, "session", "explicit_request", "R2 more detail → reading level +1"); }
  if (s.has("SHORTER")) delta("response_length", -1, "session", "explicit_request", "R4 shorter → length −1");
  if (s.has("LONGER")) delta("response_length", +1, "session", "explicit_request", "R5 longer → length +1");
  if (s.has("WANTS_EXAMPLE")) delta("analogy_usage", +1, "session", "explicit_request", "R6 asked for an example → analogies +1");
  if (s.has("WANTS_STEPS")) change("structure", 1, "session", "explicit_request", "R7 asked for steps → step by step");
  if (s.has("CONFUSED")) {
    delta("concept_density", -1, "session", "confusion_signal", "R3 confusion → one idea at a time"); change("information_pacing", 0, "session", "confusion_signal", "R3 confusion → slower pacing");
    delta("analogy_usage", +1, "session", "confusion_signal", "R3 confusion → analogies +1"); change("teachback_frequency", 2, "session", "confusion_signal", "R3 confusion → check understanding more often", "explicit", "Comprehension and Learning Engine");
  }
  if (s.has("UNDERSTOOD") && cur().concept_density < inp.initial.concept_density) delta("concept_density", +1, "session", "explicit_request", "R9 understood → restore concept density one step");

  // 2. repeated pattern across turns → persistent "observed" preference, medium confidence, unconfirmed
  const rep: [Signal, ParamId, number, string, string][] = [["SIMPLER", "explanation_depth", -1, "Prefers simpler explanations", "R8 asked simpler twice"], ["MORE_DETAIL", "explanation_depth", +1, "Prefers more detailed explanations", "R8 asked for detail twice"], ["SHORTER", "response_length", -1, "Prefers shorter answers", "R8 asked shorter twice"], ["LONGER", "response_length", +1, "Prefers longer answers", "R8 asked longer twice"], ["WANTS_EXAMPLE", "analogy_usage", +1, "Finds examples helpful", "R8 asked for examples twice"], ["WANTS_STEPS", "structure", +1, "Prefers step-by-step explanations", "R8 asked for steps twice"]];
  for (const [sig, param, d, content, rule] of rep) if (s.has(sig) && (m.counts[sig] ?? 0) === 2 && m.persistent[param]?.basis !== "explicit") {
    const base = m.persistent[param]?.value ?? inp.initial[param]; change(param, base + d, "persistent", "repeated_pattern", rule, "observed");
    upsertRecord(m, ops, ts, inp.conv, `pref:${param}`, { kind: "observed_preference", content, source: "system_observation", confidence: "medium", status: "unconfirmed", expiry: "reconfirm_30d" }, `${sig.toLowerCase()} requested in 2 separate turns (pattern, not proof)`);
  }

  // 3. explicit lasting statements → persistent, high confidence (spec 7.3 examples 1 and 2)
  const pref = (param: ParamId, value: number, content: string, rule: string) => { change(param, value, "persistent", "explicit_preference", rule, "explicit"); upsertRecord(m, ops, ts, inp.conv, `pref:${param}`, { kind: "explicit_preference", content, source: "user_statement", confidence: "high", status: "active", expiry: "reconfirm_90d" }, `Stated directly: “${quote}”`); };
  for (const st of inp.statements) {
    if (st.kind === "PREFERS_VISUAL") pref("visual_support", 1, "Prefers visual explanations (pictures, diagrams)", "S1 stated visual preference");
    if (st.kind === "PREFERS_DETAIL") pref("explanation_depth", 2, "Wants more detailed explanations", "S2 stated preference for more detail");
    if (st.kind === "PREFERS_SIMPLE") { pref("explanation_depth", 0, "Wants explanations in simple words", "S3 stated preference for simple words"); change("terminology_density", 0, "persistent", "explicit_preference", "S3 simple words → low terminology"); }
    if (st.kind === "PREFERS_SHORT") pref("response_length", 0, "Prefers short answers", "S4 stated preference for short answers");
    if (st.kind === "PREFERS_EXAMPLES") pref("analogy_usage", 2, "Finds examples and analogies helpful", "S5 stated preference for examples");
    if (st.kind === "PREFERS_DEFINITIONS") pref("definition_frequency", 2, "Wants medical words explained", "S6 asked for definitions");
    if (st.kind === "PREFERS_STEPS") pref("structure", 1, "Wants to know exactly what will happen, step by step", "S7 stated preference for steps");
    if (st.kind === "PREFERRED_NAME") upsertRecord(m, ops, ts, inp.conv, "profile:name", { kind: "profile", content: `Preferred name: ${st.value}`, source: "user_statement", confidence: "high", status: "active", expiry: "never" }, "Stated directly");
    if (st.kind === "HAS_PROCEDURE") upsertRecord(m, ops, ts, inp.conv, `medical:procedure:${st.value}`, { kind: "medical_context", content: `Upcoming or recent procedure: ${st.value} (said by reader, not clinically verified)`, source: "user_statement", confidence: "medium", status: "unconfirmed", expiry: "reconfirm_30d" }, "Reader mentioned it. Stored as unverified, never as a confirmed medical fact");
    if (st.kind === "UNSURE_PROCEDURE") {
      const ex = m.records.find(r => r.key === `medical:procedure:${st.value}` && r.status !== "deleted");
      if (ex && ex.status !== "outdated") { ex.history.push({ ts, action: "marked_outdated", prev: ex.content, next: null, reason: "Reader is not sure this is their procedure; removed from confirmed context", by: "system" }); ex.status = "outdated"; ops.push({ op: "marked_outdated", id: ex.id, content: ex.content, reason: "reader unsure" }); }
      else if (!ex) upsertRecord(m, ops, ts, inp.conv, `medical:procedure:${st.value}`, { kind: "medical_context", content: `Possible procedure: ${st.value} (reader is not sure, needs clarification)`, source: "user_statement", confidence: "low", status: "unconfirmed", expiry: "reconfirm_30d" }, "Reader unsure. Ask them or a caregiver, do not assume");
    }
  }

  // 4. emotions are temporary session context only (spec 7.3 example 4, 22.2)
  if (inp.emotion.declines) { change("emotional_followup", 0, "session", "emotional_signal", "E1 asked not to talk about feelings → pause emotional questions", "explicit", "Psychological Communication Engine"); upsertRecord(m, ops, ts, inp.conv, "session:declines_feelings", { kind: "temporary_session", content: "Asked not to talk about feelings right now", source: "user_statement", confidence: "high", status: "active", expiry: "end_of_session" }, "Respect the request for this session only; not a lasting dislike of support"); }
  if (inp.emotion.expressed && inp.emotion.type && inp.emotion.type !== "confusion") {
    upsertRecord(m, ops, ts, inp.conv, `session:emotion:${inp.emotion.type}`, { kind: "temporary_session", content: `Said they feel ${inp.emotion.type === "fear" ? "worried or scared" : inp.emotion.type} (this session only, not a diagnosis)`, source: "user_statement", confidence: "high", status: "active", expiry: "end_of_session" }, "Explicitly expressed. Stored only for this session");
    if (inp.emotion.type === "fear" || inp.emotion.type === "sadness") delta("concept_density", -1, "session", "emotional_signal", `E2 ${inp.emotion.type} → avoid overwhelming detail`, "explicit", "Psychological Communication Engine");
    if (inp.emotion.type === "frustration") delta("analogy_usage", +1, "session", "emotional_signal", "E3 frustration → try a different explanation", "explicit", "Psychological Communication Engine");
    if (inp.emotion.type === "curiosity") delta("explanation_depth", +1, "session", "emotional_signal", "E4 curiosity → offer more depth", "explicit", "Psychological Communication Engine");
  }

  // 5. educational memory for this topic
  let revise: string | null = null;
  if (inp.topic) {
    const t = inp.topicTitle ?? inp.topic;
    if (s.has("CONFUSED")) { m.confusion[inp.topic] = (m.confusion[inp.topic] ?? 0) + 1; upsertRecord(m, ops, ts, inp.conv, `edu:clarify:${inp.topic}`, { kind: "educational_context", content: `${t}: needs clarification (said it was confusing ${m.confusion[inp.topic]}×)`, source: "user_statement", confidence: m.confusion[inp.topic] >= 2 ? "high" : "medium", status: "active", expiry: "reconfirm_30d" }, "Reader said it was confusing"); }
    if (s.has("UNDERSTOOD")) { m.understood[inp.topic] = (m.understood[inp.topic] ?? 0) + 1; upsertRecord(m, ops, ts, inp.conv, `edu:understood:${inp.topic}`, { kind: "educational_context", content: `${t}: says they understand (self-report, not tested)`, source: "user_statement", confidence: "low", status: "active", expiry: "reconfirm_30d" }, "Self-reported understanding is low confidence until checked"); }
    upsertRecord(m, ops, ts, inp.conv, `edu:introduced:${inp.topic}`, { kind: "educational_context", content: `${t}: explained`, source: "system_observation", confidence: "high", status: "active", expiry: "never" }, "Topic explained in this conversation");
    if ((m.confusion[inp.topic] ?? 0) >= 2 || (m.failedChecks[inp.topic] ?? 0) >= 1) revise = (m.failedChecks[inp.topic] ?? 0) >= 1 ? "A comprehension check on this topic was missed, so the explanation changes approach" : "Confusion on this topic more than once, so the explanation changes approach";
  }
  m.events = m.events.slice(-400); m.records = m.records.slice(-300);
  return { memory: m, events, ops, revise, before, after: cur() };
}

/** Teach-back result (spec 3.1 level 2, 7.1 B). A correct answer is medium-confidence evidence, an incorrect one triggers revision. */
export function recordCheck(mIn: Memory, inp: { topic: string; topicTitle: string; correct: boolean; question: string; conv: string | null; initial: Config; ts?: string }): AdaptOutput {
  const ts = inp.ts ?? new Date().toISOString(); const m = clone(mIn); const ops: MemOp[] = []; const events: AdaptEvent[] = [];
  const before = effective(inp.initial, m, inp.conv);
  const push = (param: ParamId, next: number, rule: string) => { const prev = effective(inp.initial, m, inp.conv)[param]; const n = clampParam(param, next); if (prev === n) return; m.session.conv = inp.conv; m.session.values[param] = n; const ev: AdaptEvent = { id: id("AE"), ts, conv: inp.conv, msg: null, param, prev, next: n, scope: "session", trigger: "comprehension_check", evidence: `Teach-back: “${inp.question.slice(0, 90)}” → ${inp.correct ? "correct" : "incorrect"}`, rule, component: "Comprehension and Learning Engine", reviewRequired: false, status: "applied" }; events.push(ev); m.events.push(ev); };
  if (inp.correct) {
    upsertRecord(m, ops, ts, inp.conv, `edu:demonstrated:${inp.topic}`, { kind: "educational_context", content: `${inp.topicTitle}: answered a teach-back question correctly`, source: "teach_back", confidence: "medium", status: "active", expiry: "reconfirm_30d" }, "Immediate check only. Does not establish long-term retention");
    const c = effective(inp.initial, m, inp.conv); if (c.teachback_frequency > inp.initial.teachback_frequency) push("teachback_frequency", inp.initial.teachback_frequency, "C1 check passed → return teach-back to default");
  } else {
    m.failedChecks[inp.topic] = (m.failedChecks[inp.topic] ?? 0) + 1;
    upsertRecord(m, ops, ts, inp.conv, `edu:clarify:${inp.topic}`, { kind: "educational_context", content: `${inp.topicTitle}: needs clarification (missed a teach-back question)`, source: "teach_back", confidence: "medium", status: "active", expiry: "reconfirm_30d" }, "Teach-back answer was incorrect");
    const c = effective(inp.initial, m, inp.conv); push("concept_density", c.concept_density - 1, "C2 check missed → one idea at a time"); push("analogy_usage", c.analogy_usage + 1, "C2 check missed → use an analogy");
  }
  return { memory: m, events, ops, revise: inp.correct ? null : "A comprehension check was missed", before, after: effective(inp.initial, m, inp.conv) };
}

/** Undo an adaptation (spec 7.5, 18.2). Creates a reversal event; nothing is deleted from history. */
export function reverseEvent(mIn: Memory, eventId: string, initial: Config, ts = new Date().toISOString()): Memory {
  const m = clone(mIn); const ev = m.events.find(e => e.id === eventId); if (!ev || ev.status !== "applied") return mIn;
  const rev: AdaptEvent = { ...ev, id: id("AE"), ts, prev: ev.next, next: ev.prev, trigger: "reversal", evidence: `Reader undid ${ev.id}`, rule: `Reversal of ${ev.id}`, status: "applied", reverses: ev.id };
  if (ev.scope === "session" && m.session.conv === ev.conv) m.session.values[ev.param] = ev.prev;
  if (ev.scope === "persistent") { if (ev.prev === initial[ev.param]) delete m.persistent[ev.param]; else m.persistent[ev.param] = { value: ev.prev, basis: "explicit", since: ts, event: rev.id }; }
  ev.status = "reversed"; ev.reversedBy = rev.id; m.events.push(rev);
  const rec = m.records.find(r => r.key === `pref:${ev.param}` && r.status !== "deleted");
  if (rec && ev.scope === "persistent") { rec.history.push({ ts, action: "corrected", prev: rec.content, next: null, reason: `Reader undid the change (${ev.id})`, by: "user" }); rec.status = "corrected"; }
  return m;
}

/** Reader or caregiver correction of a memory record (spec 7.5, 22.2). The old value stays in history. */
export function editRecord(mIn: Memory, recId: string, action: "confirm" | "correct" | "outdated" | "delete" | "restore", next?: string, ts = new Date().toISOString()): Memory {
  const m = clone(mIn); const r = m.records.find(x => x.id === recId); if (!r) return mIn;
  if (action === "confirm") { r.history.push({ ts, action: "confirmed", prev: null, next: null, reason: "Confirmed by the reader", by: "user" }); r.lastConfirmed = ts; r.confidence = "high"; if (r.status === "unconfirmed") r.status = "active"; }
  if (action === "correct" && next) { r.history.push({ ts, action: "corrected", prev: r.content, next, reason: "Corrected by the reader", by: "user" }); r.content = next; r.source = "user_statement"; r.confidence = "high"; r.status = "active"; r.lastConfirmed = ts; }
  if (action === "outdated") { r.history.push({ ts, action: "marked_outdated", prev: r.content, next: null, reason: "Marked outdated by the reader", by: "user" }); r.status = "outdated"; }
  if (action === "delete") { r.history.push({ ts, action: "deleted", prev: null, next: null, reason: "Deleted at the reader's request (content removed, audit entry kept)", by: "user" }); r.content = "(deleted by reader)"; r.status = "deleted"; }
  if (action === "restore" && r.status !== "deleted") { r.history.push({ ts, action: "restored", prev: null, next: null, reason: "Restored by the reader", by: "user" }); r.status = "active"; }
  return m;
}

/** Records relevant to a question: active preferences, and educational context for this topic. Used for the "accessed" memory operations. */
export function relevantRecords(m: Memory, topic: string | null): MemoryRecord[] {
  return m.records.filter(r => (r.status === "active" || r.status === "unconfirmed") && (r.kind.endsWith("preference") || r.kind === "temporary_session" || r.kind === "profile" || (topic && r.key.endsWith(`:${topic}`))));
}

export const eventLabel = (e: AdaptEvent) => `${PARAM[e.param].label}: ${label(e.param, e.prev)} → ${label(e.param, e.next)}`;

/** Bring an older memory (schema 1 or 2: level shift, length bias, scaffolding) forward without losing the counts it learned. */
export function migrateMemory(raw: unknown): Memory {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (o.schema === 3) return { ...DEFAULT_MEMORY, ...(o as unknown as Memory) };
  return { ...DEFAULT_MEMORY, confusion: (o.confusion as Record<string, number>) ?? {}, understood: (o.understood as Record<string, number>) ?? {}, turns: Number(o.turns) || 0 };
}

/** The adaptation policy as a table, for the Method page and for tests that check every rule used in code is documented here. */
export const POLICY_TABLE: { id: string; when: string; does: string; scope: string; component: string }[] = [
  { id: "R1", when: "Reader asks for simpler", does: "Depth −1, terminology −1, reading level −1", scope: "This conversation", component: "Developmental and Linguistic" },
  { id: "R2", when: "Reader asks for more detail", does: "Depth +1, terminology +1, reading level +1", scope: "This conversation", component: "Developmental and Linguistic" },
  { id: "R3", when: "Reader says it is confusing", does: "One idea at a time, slower pacing, more analogies, more frequent teach-back; topic marked as needing clarification", scope: "This conversation", component: "Comprehension and Memory" },
  { id: "R4", when: "Reader asks for shorter", does: "Response length −1", scope: "This conversation", component: "Linguistic" },
  { id: "R5", when: "Reader asks for longer", does: "Response length +1", scope: "This conversation", component: "Linguistic" },
  { id: "R6", when: "Reader asks for an example", does: "Analogies +1", scope: "This conversation", component: "Linguistic" },
  { id: "R7", when: "Reader asks for steps", does: "Step-by-step structure", scope: "This conversation", component: "Linguistic" },
  { id: "R8", when: "The same request in two separate turns", does: "Saved as an observed preference, medium confidence, unconfirmed until the reader confirms it", scope: "Persistent (observed)", component: "Memory" },
  { id: "R9", when: "Reader says they understand", does: "Concept density back up one step; self-reported understanding stored at low confidence", scope: "This conversation", component: "Comprehension" },
  { id: "S1–S7", when: "Reader states a lasting preference (pictures, more detail, simple words, short answers, examples, definitions, steps)", does: "Matching parameter set; explicit preference stored at high confidence", scope: "Persistent (explicit)", component: "Patient Context Manager" },
  { id: "E1", when: "Reader asks not to talk about feelings", does: "Emotional follow-up paused; temporary record that expires with the conversation", scope: "This conversation", component: "Psychological" },
  { id: "E2–E4", when: "Reader states fear, sadness, frustration or curiosity", does: "Fewer ideas at once (fear, sadness), a different explanation (frustration) or more depth (curiosity); temporary record, never a diagnosis", scope: "This conversation", component: "Psychological" },
  { id: "C1", when: "Teach-back answered correctly", does: "Demonstrated understanding recorded (immediate only); teach-back frequency returns to default", scope: "This conversation", component: "Comprehension" },
  { id: "C2", when: "Teach-back missed", does: "One idea at a time and an analogy; the next answer on the topic changes approach (Response Revision Engine)", scope: "This conversation", component: "Comprehension and Revision" },
];
