import { NextResponse } from "next/server";
import { health } from "@/lib/gemini";
export async function GET() { return NextResponse.json(await health(process.env.GEMINI_API_KEY), { headers: { "cache-control": "no-store" } }); }
