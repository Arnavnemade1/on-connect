import { NextResponse } from "next/server";
import { generate, pickLLM } from "@/lib/llm";
import { TOPICS } from "@/lib/content";
import { cleanProfile } from "@/lib/pipeline";
import { langOf } from "@/lib/langs";
import { clientIp, limited } from "@/lib/ratelimit";

// Suggests three short next questions a child or caregiver might ask. Falls back to the topic's curated questions.
export async function POST(req: Request) {
  if (limited(clientIp(req), 60)) return NextResponse.json({ questions: [], source: "rate-limited" });
  const { question, answer, topicId, profile } = await req.json().catch(() => ({}));
  const topic = TOPICS.find(t => t.id === topicId);
  const fallback = topic ? topic.questions.slice(0, 3) : [];
  const llm = pickLLM();
  if (!llm || typeof answer !== "string") return NextResponse.json({ questions: fallback, source: "curated" });
  const p = cleanProfile(profile); const lang = langOf(p.lang);
  const r = await generate(llm, `Suggest exactly 3 short follow-up questions (max 9 words each) that a child aged ${p.age} or their caregiver might ask next. Write them in ${lang.name}, first person, simple words. Return ONLY a JSON array of 3 strings.`,
    [{ role: "user", text: `Question: ${String(question).slice(0, 300)}\nAnswer: ${answer.slice(0, 1200)}` }], { timeout: 9000, maxOutputTokens: 400 });
  try {
    const arr = JSON.parse((r.text ?? "").replace(/^```(json)?|```$/gm, "").trim());
    const qs = Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === "string" && x.length < 90).slice(0, 3) : [];
    if (qs.length) return NextResponse.json({ questions: qs, source: "model" });
  } catch { /* fall through */ }
  return NextResponse.json({ questions: fallback, source: "curated" });
}
