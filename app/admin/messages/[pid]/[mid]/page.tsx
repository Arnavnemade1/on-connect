import Link from "next/link";
import { notFound } from "next/navigation";
import { gate, logAccess, participant } from "@/lib/admin";
import MessageReport from "@/components/MessageReport";
import { DEFAULT_PROFILE, type Reply } from "@/lib/engine";
import { DEFAULT_MEMORY } from "@/lib/memory";
import type { MsgRow } from "@/lib/adminMetrics";

export const dynamic = "force-dynamic";

/** Level 1 message report for an authorized participant's message (spec 9.2, 14.1, 21.3 item 2). */
export default async function AdminMessage({ params }: { params: Promise<{ pid: string; mid: string }> }) {
  const g = await gate(); if (!g.ok) return null; const { pid, mid } = await params;
  const p = await participant(g.ctx, pid); if (!p) notFound(); await logAccess(g.ctx, "view_message", `${pid}/${mid}`);
  const { data } = await g.ctx.sb.from("messages").select("*").eq("user_id", p.user_id).eq("id", mid).maybeSingle(); const m = data as MsgRow | null; if (!m || m.role !== "assistant" || !m.report) notFound();
  const { data: conv } = await g.ctx.sb.from("messages").select("*").eq("user_id", p.user_id).eq("conversation_id", m.conversation_id).order("created_at"); const msgs = (conv ?? []) as MsgRow[];
  const i = msgs.findIndex(x => x.id === mid); const question = [...msgs.slice(0, i)].reverse().find(x => x.role === "user"); const next = msgs.slice(i + 1).find(x => x.role === "assistant");
  const r = m.report; const reply = { ...r, text: m.content, id: m.id, ts: m.created_at, conv: m.conversation_id, topicId: r.topic ?? null, events: [], memory: DEFAULT_MEMORY, used: [], changed: [], notDone: [], adaptations: r.adaptations ?? [], trace: r.trace ?? [], signals: r.signals ?? [], source: r.topic ? "Onconnect approved content (draft)" : null, safety: r.safety ?? null } as unknown as Reply;
  const profile = { ...DEFAULT_PROFILE, age: (p.age_band ?? DEFAULT_PROFILE.age) as typeof DEFAULT_PROFILE.age, stage: (p.care_stage ?? "") as typeof DEFAULT_PROFILE.stage, role: p.user_type === "caregiver" ? "caregiver" as const : p.user_type === "together" ? "together" as const : "child" as const };
  const nextMsg = next ? { id: next.id, role: "bot" as const, text: next.content, reply: { signals: next.report?.signals ?? [] } as unknown as Reply } : undefined;
  return (<><div className="admhead"><div><div className="eyebrow"><Link href={`/admin/participants/${pid}`}><code>{pid}</code></Link> · message report</div><h1>{question ? `“${question.content.slice(0, 90)}”` : "Message report"}</h1>
      <p className="muted">The report separates the settings that were intended from what the output actually measured.</p></div></div>
    <div className="admcols"><div><h2>Message</h2><div className="admmsg">{m.content}</div>{(r.events?.length ?? 0) > 0 && <p className="muted">Adaptation events: {r.events.join(", ")}</p>}</div>
      <div><MessageReport reply={reply} next={nextMsg} profile={profile} question={question?.content ?? ""} /></div></div></>);
}
