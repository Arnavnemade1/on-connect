import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { persistRecord } from "@/lib/persist";
import { clientIp, limited } from "@/lib/ratelimit";

// Saves client-side events (comprehension checks, reversals, memory corrections) for signed-in users. Guests get a no-op.
export async function POST(req: Request) {
  if (limited(clientIp(req))) return NextResponse.json({ ok: false }, { status: 429 });
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const sb = await supabaseServer(); if (!sb) return NextResponse.json({ ok: false, saved: false });
  const { data } = await sb.auth.getUser(); if (!data.user) return NextResponse.json({ ok: true, saved: false });
  try { await persistRecord(sb, data.user.id, body); return NextResponse.json({ ok: true, saved: true }); } catch { return NextResponse.json({ ok: false, saved: false }); }
}
