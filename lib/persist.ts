// Server-side persistence to Supabase (spec 21.2, 21.5 step 9). Runs as the signed-in user, so row level security applies.
// Guests are never written. Failures are swallowed: storage must never break the conversation.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Reply } from "./engine";
import type { AdaptEvent, Memory, MemOp } from "./memory";

const ID = /^[A-Za-z0-9-]{4,40}$/;
const USER_TYPE: Record<string, string> = { child: "patient", caregiver: "caregiver", together: "together" };

/** The message-level report kept with each assistant message (spec 9.1). The text and the full memory are stored elsewhere. */
export const reportOf = (r: Reply) => ({ guidance: r.guidance, topic: r.topicId, signals: r.signals, config: r.config, configBefore: r.configBefore, plan: r.plan, events: (r.events ?? []).map(e => e.id), ops: r.ops, psych: r.psych, revise: r.revise,
  sources: r.sources, citations: r.citations, teachback: r.teachback ? { topic: r.teachback.topic, question: r.teachback.q.q } : null, trace: r.trace, metrics: r.metrics, coverage: r.coverage, adaptations: r.adaptations, safety: r.safety,
  model: r.model, versions: r.versions, latencyMs: r.latencyMs, lang: r.lang, mode: r.mode, resources: r.resources });

const eventRow = (uid: string, conv: string | null, e: AdaptEvent) => ({ user_id: uid, id: e.id, conversation_id: conv, message_id: e.msg, ts: e.ts, parameter: e.param, prev: e.prev, next: e.next, scope: e.scope, trigger: e.trigger, evidence: e.evidence.slice(0, 200), rule: e.rule, component: e.component, status: e.status, reverses: e.reverses ?? null });
function recordRows(uid: string, memory: Memory, ops: MemOp[]) {
  const ids = new Set(ops.filter(o => o.op !== "accessed").map(o => o.id));
  return memory.records.filter(r => ids.has(r.id)).map(r => ({ user_id: uid, id: r.id, kind: r.kind, key: r.key, content: r.content.slice(0, 500), source: r.source, confidence: r.confidence, status: r.status, created: r.created, last_confirmed: r.lastConfirmed, expiry: r.expiry, sessions: r.sessions.slice(-50), history: r.history.slice(-50), updated_at: new Date().toISOString() }));
}

export async function persistTurn(sb: SupabaseClient, uid: string, inp: { conversationId: string; title: string; userMessageId: string; question: string; profile: Profile; reply: Reply }) {
  const { conversationId: conv, reply } = inp; if (!ID.test(conv) || !ID.test(inp.userMessageId) || !reply.id) return;
  const now = new Date().toISOString();
  await sb.from("profiles").upsert({ user_id: uid, user_type: USER_TYPE[inp.profile.role] ?? "patient", age_band: inp.profile.age, care_stage: inp.profile.stage || null, updated_at: now }, { onConflict: "user_id" });
  await sb.from("conversations").upsert({ user_id: uid, id: conv, title: inp.title.slice(0, 120), updated_at: now }, { onConflict: "user_id,id" });
  await sb.from("messages").upsert([
    { user_id: uid, id: inp.userMessageId, conversation_id: conv, role: "user", content: inp.question.slice(0, 20000), report: null, created_at: reply.ts ?? now },
    { user_id: uid, id: reply.id, conversation_id: conv, role: "assistant", content: reply.text.slice(0, 20000), report: reportOf(reply), created_at: reply.ts ?? now },
  ], { onConflict: "user_id,id" });
  if (reply.events?.length) await sb.from("adaptation_events").upsert(reply.events.map(e => eventRow(uid, conv, e)), { onConflict: "user_id,id" });
  const recs = recordRows(uid, reply.memory, reply.ops ?? []); if (recs.length) await sb.from("memory_records").upsert(recs, { onConflict: "user_id,id" });
  if (reply.resources?.length) await sb.from("resource_matches").insert(reply.resources.map(r => ({ user_id: uid, org_id: /^[0-9a-f-]{36}$/.test(r.id) ? r.id : null, category: r.category })));
}

export async function persistRecord(sb: SupabaseClient, uid: string, body: Record<string, unknown>) {
  const kind = body.kind; const conv = typeof body.conversationId === "string" && ID.test(body.conversationId) ? body.conversationId : null;
  if (kind === "check") {
    const c = body.check as { topic?: string; q?: string; choice?: number; correct?: boolean; ts?: string } | undefined; if (!c || typeof c.correct !== "boolean") return;
    await sb.from("comprehension_checks").insert({ user_id: uid, conversation_id: conv, message_id: typeof body.messageId === "string" ? body.messageId.slice(0, 40) : null, topic: String(c.topic ?? "").slice(0, 40), question: String(c.q ?? "").slice(0, 300), choice: Number(c.choice) || 0, correct: c.correct, ts: c.ts ?? new Date().toISOString() });
    const events = (Array.isArray(body.events) ? body.events : []) as AdaptEvent[]; if (events.length) await sb.from("adaptation_events").upsert(events.slice(0, 20).map(e => eventRow(uid, conv, e)), { onConflict: "user_id,id" });
    const memory = body.memory as Memory | undefined; const ops = (Array.isArray(body.ops) ? body.ops : []) as MemOp[];
    if (memory?.records) { const recs = recordRows(uid, memory, ops); if (recs.length) await sb.from("memory_records").upsert(recs, { onConflict: "user_id,id" }); }
  }
  if (kind === "record_edit") { const r = body.record as Memory["records"][number] | undefined; if (r && ID.test(r.id)) await sb.from("memory_records").upsert({ user_id: uid, id: r.id, kind: r.kind, key: String(r.key).slice(0, 120), content: String(r.content).slice(0, 500), source: r.source, confidence: r.confidence, status: r.status, created: r.created, last_confirmed: r.lastConfirmed, expiry: r.expiry, sessions: (r.sessions ?? []).slice(-50), history: (r.history ?? []).slice(-50), updated_at: new Date().toISOString() }, { onConflict: "user_id,id" }); }
  if (kind === "reversal" && typeof body.event === "string" && ID.test(body.event)) await sb.from("adaptation_events").update({ status: "reversed" }).eq("user_id", uid).eq("id", body.event);
}
