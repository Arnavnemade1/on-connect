import { NextResponse } from "next/server";
import { run, type RunInput } from "@/lib/pipeline";
import { clientIp, limited } from "@/lib/ratelimit";
import { supabaseServer } from "@/lib/supabase/server";
import { persistTurn } from "@/lib/persist";
import type { Reply } from "@/lib/engine";

export const maxDuration = 60;
type Body = RunInput & { stream?: boolean; userMessageId?: string; title?: string };

/** Spec 21.5 step 9: when the user is signed in, store the turn, its report, adaptation events and memory changes. */
async function save(b: Body, reply: Reply) {
  if (!b.conversationId || !b.userMessageId) return;
  try { const sb = await supabaseServer(); if (!sb) return; const { data } = await sb.auth.getUser(); if (!data.user) return;
    await persistTurn(sb, data.user.id, { conversationId: b.conversationId, title: typeof b.title === "string" ? b.title : b.question.slice(0, 48), userMessageId: b.userMessageId, question: b.question, profile: b.profile, reply }); } catch { /* storage must never break the conversation */ }
}

export async function POST(req: Request) {
  if (limited(clientIp(req))) return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  let b: Body;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof b?.question !== "string" || !b.question.trim()) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  if (!b.stream) { const reply = await run(b, undefined, req.signal); await save(b, reply); return NextResponse.json(reply); }

  // NDJSON stream: {t:"delta"|"replace"|"status"} ... then {t:"final", reply}
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => { try { ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { /* client went away */ } };
      try { const reply = await run(b, send, req.signal); send({ t: "final", reply }); await save(b, reply); }
      catch (e) { send({ t: "error", message: e instanceof Error ? e.message : "failed" }); }
      try { ctrl.close(); } catch { /* already closed */ }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
