// Research Admin access (spec 21.3, 21.4). Every check runs on the server with the caller's own session, so
// row level security still applies; the role comes from app_metadata, which users cannot edit.
import "server-only";
import { supabaseServer } from "./supabase/server";

export type AdminCtx = { sb: NonNullable<Awaited<ReturnType<typeof supabaseServer>>>; userId: string; email: string; role: string };
export type Gate = { ok: true; ctx: AdminCtx } | { ok: false; reason: "not_configured" | "signed_out" | "forbidden"; email?: string };

export async function gate(): Promise<Gate> {
  const sb = await supabaseServer(); if (!sb) return { ok: false, reason: "not_configured" };
  const { data } = await sb.auth.getUser(); const u = data.user; if (!u) return { ok: false, reason: "signed_out" };
  const role = String((u.app_metadata as Record<string, unknown>)?.role ?? "");
  if (role !== "researcher" && role !== "admin") return { ok: false, reason: "forbidden", email: u.email ?? undefined };
  return { ok: true, ctx: { sb, userId: u.id, email: u.email ?? "", role } };
}

/** Writes an audit entry for every page view and export (spec 21.3 item 5). Never throws. */
export async function logAccess(ctx: AdminCtx, action: string, target?: string, details?: Record<string, unknown>) {
  try { await ctx.sb.from("admin_access_log").insert({ admin_id: ctx.userId, action: action.slice(0, 60), target: target?.slice(0, 120) ?? null, details: details ?? null }); } catch { /* auditing must not break the page */ }
}

export interface Participant { user_id: string; pseudonym: string; user_type: string; age_band: string | null; care_stage: string | null; research_consent: boolean; consent_at: string | null; created_at: string; updated_at: string; }
export async function participants(ctx: AdminCtx): Promise<Participant[]> {
  const { data } = await ctx.sb.from("profiles").select("*").eq("research_consent", true).order("updated_at", { ascending: false });
  return (data ?? []) as Participant[];
}
export async function participant(ctx: AdminCtx, pseudonym: string): Promise<Participant | null> {
  const { data } = await ctx.sb.from("profiles").select("*").eq("pseudonym", pseudonym).eq("research_consent", true).maybeSingle();
  return (data as Participant) ?? null;
}

import type { CheckRow, EvRow, Filters, MsgRow, RecRow } from "./adminMetrics";
/** Loads consented participants' rows. RLS already restricts researchers to consented participants; this is the second, explicit filter. */
export async function loadResearch(ctx: AdminCtx, f: Filters = {}, only?: string) {
  const ps = await participants(ctx); const pool = ps.filter(p => (!f.age || p.age_band === f.age) && (!f.stage || p.care_stage === f.stage) && (!only || p.user_id === only));
  const ids = pool.map(p => p.user_id); if (!ids.length) return { ps: pool, all: ps, conversations: [], msgs: [] as MsgRow[], events: [] as EvRow[], records: [] as RecRow[], checks: [] as CheckRow[] };
  const inRange = <T extends { created_at?: string; ts?: string }>(rows: T[]) => rows.filter(r => { const t = (r.ts ?? r.created_at ?? "").slice(0, 10); return (!f.from || t >= f.from) && (!f.to || t <= f.to); });
  const [c, m, e, r, k] = await Promise.all([
    ctx.sb.from("conversations").select("*").in("user_id", ids).limit(5000), ctx.sb.from("messages").select("*").in("user_id", ids).order("created_at").limit(10000),
    ctx.sb.from("adaptation_events").select("*").in("user_id", ids).order("ts").limit(10000), ctx.sb.from("memory_records").select("*").in("user_id", ids).limit(5000), ctx.sb.from("comprehension_checks").select("*").in("user_id", ids).order("ts").limit(5000),
  ]);
  return { ps: pool, all: ps, conversations: inRange((c.data ?? []) as { created_at: string; user_id: string; id: string; title: string }[]), msgs: inRange((m.data ?? []) as MsgRow[]), events: inRange((e.data ?? []) as EvRow[]), records: (r.data ?? []) as RecRow[], checks: inRange((k.data ?? []) as CheckRow[]) };
}
