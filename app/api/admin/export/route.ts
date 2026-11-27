import { NextResponse } from "next/server";
import { gate, loadResearch, logAccess } from "@/lib/admin";

// Data export center (spec 15.3 item 16, 17.2). Pseudonymized: account ids are replaced by participant pseudonyms. Every export is logged.
export async function GET(req: Request) {
  const g = await gate(); if (!g.ok) return NextResponse.json({ error: "Research Admin access required" }, { status: 403 });
  const u = new URL(req.url); const kind = u.searchParams.get("kind") ?? "all"; const format = u.searchParams.get("format") === "csv" ? "csv" : "json";
  const d = await loadResearch(g.ctx); const pseudo = new Map(d.ps.map(p => [p.user_id, p.pseudonym])); const P = (id: string) => pseudo.get(id) ?? "unknown";
  const sets: Record<string, Record<string, unknown>[]> = {
    participants: d.ps.map(p => ({ participant: p.pseudonym, user_type: p.user_type, age_band: p.age_band, care_stage: p.care_stage, consent_at: p.consent_at })),
    messages: d.msgs.map(m => ({ participant: P(m.user_id), conversation: m.conversation_id, message: m.id, role: m.role, created_at: m.created_at, text: m.content, grade: m.report?.metrics?.grade ?? null, target_grade: m.report?.plan?.targetGrade ?? null, words: m.report?.metrics?.words ?? null, level_used: m.report?.plan?.level ?? null, model: m.report?.model ?? null, system_version: m.report?.versions?.system ?? null, citation_coverage: m.report?.citations?.coverage ?? null, emotion: m.report?.psych?.type ?? null, latency_ms: m.report?.latencyMs ?? null })),
    adaptation_events: d.events.map(e => ({ participant: P(e.user_id), event: e.id, conversation: e.conversation_id, message: e.message_id, ts: e.ts, parameter: e.parameter, prev: e.prev, next: e.next, scope: e.scope, trigger: e.trigger, rule: e.rule, component: e.component, status: e.status, reverses: e.reverses })),
    memory_records: d.records.map(r => ({ participant: P(r.user_id), record: r.id, kind: r.kind, status: r.status, confidence: r.confidence, source: r.source, created: r.created, changes: r.history.length, content: r.status === "deleted" ? null : r.content })),
    comprehension_checks: d.checks.map(c => ({ participant: P(c.user_id), conversation: c.conversation_id, message: c.message_id, topic: c.topic, correct: c.correct, ts: c.ts })),
  };
  const pick = kind === "all" ? sets : { [kind]: sets[kind] ?? [] };
  await logAccess(g.ctx, "export", kind, { format, rows: Object.values(pick).reduce((s, a) => s + a.length, 0) });
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") return new NextResponse(JSON.stringify({ exported: new Date().toISOString(), note: "Pseudonymized Onconnect research export. Internal measurements; not clinical measures.", ...pick }, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="onconnect-${kind}-${stamp}.json"` } });
  const rows = Object.values(pick)[0] ?? []; const cols = rows.length ? Object.keys(rows[0]) : []; const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return new NextResponse([cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n"), { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="onconnect-${kind}-${stamp}.csv"` } });
}
