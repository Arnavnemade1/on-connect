import { NextResponse } from "next/server";
import { gate, logAccess } from "@/lib/admin";
// Lets client-side admin actions (like exporting a timeline) write an audit entry. Researchers only.
export async function GET(req: Request) {
  const g = await gate(); if (!g.ok) return NextResponse.json({ ok: false }, { status: 403 });
  const u = new URL(req.url); await logAccess(g.ctx, (u.searchParams.get("action") ?? "action").slice(0, 60), u.searchParams.get("target") ?? undefined); return NextResponse.json({ ok: true });
}
