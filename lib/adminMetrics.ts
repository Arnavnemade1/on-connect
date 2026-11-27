// Research Center metrics (spec 11.1–11.8, Part XVI). Pure functions over stored rows.
// Every metric carries its definition, numerator, denominator, missing count and source (spec 11.1: no percentage without explanation).
export interface MsgRow { user_id: string; id: string; conversation_id: string; role: "user" | "assistant"; content: string; report: Record<string, any> | null; created_at: string; }
export interface EvRow { user_id: string; id: string; conversation_id: string | null; message_id: string | null; ts: string; parameter: string; prev: number; next: number; scope: string; trigger: string; evidence: string | null; rule: string | null; component: string | null; status: string; reverses: string | null; }
export interface RecRow { user_id: string; id: string; kind: string; key: string; content: string; source: string; confidence: string; status: string; created: string; last_confirmed: string | null; expiry: string | null; sessions: string[]; history: { ts: string; action: string; prev: string | null; next: string | null; reason: string; by: string }[]; }
export interface CheckRow { user_id: string; conversation_id: string | null; message_id: string | null; topic: string; question: string; correct: boolean; ts: string; }
export interface Metric { key: string; label: string; value: string; num: number | null; den: number | null; missing: number; definition: string; source: string; ci?: [number, number] | null; }

/** Wilson score interval for a proportion (95%). */
export function wilson(k: number, n: number): [number, number] | null {
  if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)];
}
const pct = (k: number, n: number) => (n ? `${Math.round((k / n) * 100)}%` : "n/a");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const r1 = (x: number | null) => (x == null ? "n/a" : String(Math.round(x * 10) / 10));
export const tally = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);

export interface Filters { from?: string; to?: string; age?: string; stage?: string; }
export function applyFilters<T extends { ts?: string; created_at?: string; user_id: string }>(rows: T[], f: Filters, users?: Set<string>): T[] {
  return rows.filter(r => { const t = (r.ts ?? r.created_at ?? "").slice(0, 10); return (!f.from || t >= f.from) && (!f.to || t <= f.to) && (!users || users.has(r.user_id)); });
}

export function overview(m: { participants: number; eligible: number; conversations: number; msgs: MsgRow[]; events: EvRow[]; records: RecRow[]; checks: CheckRow[] }): Metric[] {
  const A = m.msgs.filter(x => x.role === "assistant"); const R = A.map(x => x.report).filter(Boolean) as Record<string, any>[];
  const graded = R.filter(r => r.metrics?.grade != null && r.plan?.targetGrade != null && (r.lang ?? "en") === "en"); const inBand = graded.filter(r => Math.abs(r.metrics.grade - r.plan.targetGrade) <= 2).length;
  const cited = R.filter(r => r.citations?.coverage != null); const fact = cited.reduce((s, r) => s + r.citations.factual, 0), cf = cited.reduce((s, r) => s + r.citations.citedFactual, 0);
  const ev = m.events.filter(e => e.trigger !== "reversal"); const rev = ev.filter(e => e.status === "reversed").length;
  const correct = m.checks.filter(c => c.correct).length; const emo = R.filter(r => r.psych?.expressed); const ack = emo.filter(r => r.psych?.acknowledged).length;
  const safety = R.flatMap(r => (r.trace ?? []).filter((t: any) => t.status === "triggered" && !["VALIDATE", "CITATION_CHECK"].includes(t.name)));
  const lat = R.map(r => r.latencyMs).filter((x: unknown): x is number => typeof x === "number");
  const memChanges = m.records.reduce((s, r) => s + Math.max(0, r.history.length), 0);
  return [
    { key: "participants", label: "Active research participants", value: String(m.participants), num: m.participants, den: m.eligible, missing: 0, definition: "Accounts with research consent recorded, out of all accounts with a profile (eligible population).", source: "profiles" },
    { key: "sessions", label: "Educational sessions", value: String(m.conversations), num: m.conversations, den: null, missing: 0, definition: "Saved conversations from consented participants.", source: "conversations" },
    { key: "messages", label: "AI messages", value: String(A.length), num: A.length, den: null, missing: A.length - R.length, definition: "Assistant messages. Missing = messages saved without a structured report.", source: "messages" },
    { key: "per_session", label: "Messages per session", value: r1(m.conversations ? A.length / m.conversations : null), num: A.length, den: m.conversations, missing: 0, definition: "AI messages divided by sessions.", source: "messages, conversations" },
    { key: "events", label: "Adaptation events per message", value: r1(A.length ? ev.length / A.length : null), num: ev.length, den: A.length, missing: 0, definition: "Adaptation frequency (spec 16.1): parameter changes divided by AI messages. Reversals are not counted as new events.", source: "adaptation_events" },
    { key: "reversal", label: "Adaptation reversal rate", value: pct(rev, ev.length), num: rev, den: ev.length, missing: 0, definition: "Spec 16.2: adaptation changes later reversed, divided by all adaptation changes.", source: "adaptation_events", ci: wilson(rev, ev.length) },
    { key: "memory", label: "Memory updates", value: String(memChanges), num: memChanges, den: m.records.length, missing: 0, definition: "Entries in memory-record histories (created, updated, confirmed, corrected, outdated, expired, deleted) across all records.", source: "memory_records.history" },
    { key: "band", label: "Answers within 2 grades of target", value: pct(inBand, graded.length), num: inBand, den: graded.length, missing: R.length - graded.length, definition: "English answers whose Flesch–Kincaid grade is within ±2 of the profile's target grade. Missing = non-English or ungraded answers. Not a measure of the child's reading ability.", source: "messages.report.metrics", ci: wilson(inBand, graded.length) },
    { key: "checks", label: "Comprehension checks correct", value: pct(correct, m.checks.length), num: correct, den: m.checks.length, missing: 0, definition: "Teach-back questions answered correctly immediately after an explanation. Immediate comprehension only; it does not establish retention.", source: "comprehension_checks", ci: wilson(correct, m.checks.length) },
    { key: "citations", label: "Factual sentences cited", value: pct(cf, fact), num: cf, den: fact, missing: R.length - cited.length, definition: "Sentences the checker classes as factual that carry a citation to a verified source. Missing = template answers (topic-level sources only).", source: "messages.report.citations", ci: wilson(cf, fact) },
    { key: "ack", label: "Stated feelings acknowledged", value: pct(ack, emo.length), num: ack, den: emo.length, missing: 0, definition: "Messages where a feeling was stated and the reply acknowledged it (heuristic phrase check). Behaviour of the AI, not a psychological outcome.", source: "messages.report.psych", ci: wilson(ack, emo.length) },
    { key: "safety", label: "Safety rules fired", value: String(safety.length), num: safety.length, den: R.length, missing: 0, definition: "Triggered safety steps (crisis, individual advice, output guard, reassurance flag) per AI message.", source: "messages.report.trace" },
    { key: "latency", label: "Median response time", value: lat.length ? `${r1(median(lat)! / 1000)} s` : "n/a", num: null, den: lat.length, missing: R.length - lat.length, definition: "Server time from request to finished answer, including validation and citation checks.", source: "messages.report.latencyMs" },
  ];
}

export function adaptationBreakdown(events: EvRow[]) {
  const ev = events.filter(e => e.trigger !== "reversal");
  return { byParam: tally(ev.map(e => e.parameter)), byTrigger: tally(ev.map(e => e.trigger)), byComponent: tally(ev.map(e => e.component ?? "unknown")), byScope: tally(ev.map(e => e.scope)),
    reversedByParam: tally(ev.filter(e => e.status === "reversed").map(e => e.parameter)) };
}
export function linguistic(msgs: MsgRow[]) {
  const R = msgs.filter(m => m.role === "assistant" && m.report).map(m => m.report!);
  const by = (k: string) => R.filter(r => r.plan?.level === k);
  return ["3-5", "6-8", "9-12", "13-15", "16-18"].map(level => { const rs = by(level); return { level, n: rs.length, words: mean(rs.map(r => r.metrics?.words).filter(Number.isFinite)), grade: mean(rs.map(r => r.metrics?.grade).filter(Number.isFinite)), perSentence: mean(rs.map(r => r.metrics?.avgSentence).filter(Number.isFinite)), terms: mean(rs.map(r => r.metrics?.terms).filter(Number.isFinite)), target: rs[0]?.plan?.targetGrade ?? null }; }).filter(x => x.n);
}
export function psychological(msgs: MsgRow[]) {
  const R = msgs.filter(m => m.role === "assistant" && m.report?.psych).map(m => m.report!.psych);
  const e = R.filter(p => p.expressed);
  return { stated: e.length, byType: tally(e.map(p => p.type ?? "unknown")), acknowledged: e.filter(p => p.acknowledged).length, humanSupport: e.filter(p => p.humanSupport).length, escalations: R.filter(p => p.escalation).length, declined: R.filter(p => p.declined).length,
    falseReassurance: msgs.filter(m => (m.report?.adaptations ?? []).includes("FALSE_REASSURANCE_FLAG")).length };
}
export function medicalContext(msgs: MsgRow[], stageOf: (uid: string) => string | null) {
  const A = msgs.filter(m => m.role === "assistant" && m.report);
  return tally(A.map(m => stageOf(m.user_id) ?? "not given")).map(([stage, n]) => { const rs = A.filter(m => (stageOf(m.user_id) ?? "not given") === stage); return { stage, n, events: rs.reduce((s, m) => s + (m.report!.events?.length ?? 0), 0), topics: tally(rs.map(m => m.report!.topic ?? "general")).slice(0, 3) }; });
}
export function citationAudit(msgs: MsgRow[]) {
  const R = msgs.filter(m => m.role === "assistant" && m.report?.citations).map(m => m.report!);
  const checks = R.flatMap(r => r.citations.checks ?? []); const cited = R.flatMap(r => r.citations.cited ?? []);
  return { answers: R.length, perClaim: R.filter(r => r.citations.coverage != null).length, factual: R.reduce((s, r) => s + (r.citations.factual ?? 0), 0), citedFactual: R.reduce((s, r) => s + (r.citations.citedFactual ?? 0), 0),
    supported: checks.filter((c: any) => c.support === "supported").length, weak: checks.filter((c: any) => c.support === "weak").length, invalid: checks.filter((c: any) => c.support === "invalid").length,
    mostCited: tally(cited), uncited: R.flatMap(r => r.citations.uncited ?? []).slice(0, 12) };
}
/** Spec 10.3: early versus later interactions for one participant. Describes change; never claims cause. */
export function beforeAfter(msgs: MsgRow[], checks: CheckRow[]) {
  const A = msgs.filter(m => m.role === "assistant" && m.report).sort((a, b) => a.created_at.localeCompare(b.created_at)); if (A.length < 4) return null;
  const half = Math.floor(A.length / 2); const U = msgs.filter(m => m.role === "user").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const part = (rows: MsgRow[]) => { const R = rows.map(r => r.report!); const t0 = rows[0].created_at, t1 = rows[rows.length - 1].created_at; const us = U.filter(u => u.created_at >= t0 && u.created_at <= t1); const ck = checks.filter(c => c.ts >= t0 && c.ts <= t1);
    return { n: rows.length, words: mean(R.map(r => r.metrics?.words).filter(Number.isFinite)), terms: mean(R.map(r => r.metrics?.terms).filter(Number.isFinite)), grade: mean(R.map(r => r.metrics?.grade).filter(Number.isFinite)), teachback: R.filter(r => r.teachback).length / R.length, simpler: us.filter(u => /simpl|easier|don'?t (get|understand)|confus/i.test(u.content)).length, checks: ck.length, correct: ck.filter(c => c.correct).length }; };
  return { early: part(A.slice(0, half)), later: part(A.slice(half)) };
}
