import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const { text } = (await req.json()) as { text: string }; const t = String(text ?? "").slice(0, 500); const key = process.env.GEMINI_API_KEY;
  if (key) { try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent", { method: "POST", signal: AbortSignal.timeout(15000), headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: "Rewrite the user's question so it is clear, polite and specific for a child or parent to ask their healthcare team. Keep the meaning. Output only the question, no preface." }] }, contents: [{ role: "user", parts: [{ text: t }] }], generationConfig: { maxOutputTokens: 300 } }) });
    const j = await r.json(); const out = j?.candidates?.[0]?.content?.parts?.[0]?.text; if (out) return NextResponse.json({ text: out.trim(), model: "gemini" });
  } catch {} }
  return NextResponse.json({ text: /^(can|could|what|why|how|will|is|are|do|does)\b/i.test(t) ? t : `Can you explain ${t.replace(/[?.]+$/, "")}?`, model: "template" });
}
