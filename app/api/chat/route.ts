import { NextResponse } from "next/server";
import { respond, type Profile } from "@/lib/engine";
import { TOPICS } from "@/lib/content";
import { coverage, metrics } from "@/lib/metrics";

const PROMPT_VERSION = "adaptive-v0.3";
const MODEL = "gemini-3-flash-preview";

// All AI calls stay server-side. Without GEMINI_API_KEY (or on failure), the built-in engine answers.
export async function POST(req: Request) {
  const { question, profile, lastTopic } = (await req.json()) as { question: string; profile: Profile; lastTopic: string | null };
  const reply = respond(String(question ?? "").slice(0, 1000), profile, lastTopic);
  const key = process.env.GEMINI_API_KEY;
  const topic = TOPICS.find(t => t.id === reply.topicId);
  let model = "onconnect-templates";
  if (key && !reply.safety?.startsWith("SUPPORT")) {
    try {
      const call = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: "POST", signal: AbortSignal.timeout(20000),
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: topic
            ? `You explain medical topics to children with cancer and families. Use ONLY the facts in the approved content. Write for ages ${profile.age}; detail preference: ${profile.detail}. Be warm, honest, never give individual medical advice, never diagnose. End with: "This is general education, not advice about your own care."`
            : `You are a supportive educator for children with cancer and their families. Answer the question with accurate, general medical education written for ages ${profile.age}; detail preference: ${profile.detail}${profile.format.includes("define") ? "; define medical words" : ""}${profile.format.includes("steps") ? "; use steps where helpful" : ""}${profile.format.includes("examples") ? "; use a familiar example" : ""}. Be warm and honest about uncertainty. Never give individual medical advice, diagnoses, prognoses or dosing; for personal questions say the care team is the right source. If the question is unrelated to health or education, gently steer back. End with: "This is general education, not advice about your own care."` }] },
          contents: [{ role: "user", parts: [{ text: topic ? `Approved content:\n${JSON.stringify(topic)}\n\nQuestion: ${question}` : `Question: ${question}` }] }],
          generationConfig: { maxOutputTokens: 2000 },
        }),
      });
      let r = await call();
      if (!r.ok) { await new Promise(res => setTimeout(res, 1200)); r = await call(); }
      const j = await r.json();
      if (!r.ok) console.warn("Gemini error:", r.status, j?.error?.message);
      const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) {
        reply.text = t; model = MODEL;
        if (!topic) {
          reply.source = "General model knowledge (not from approved content)";
          reply.adaptations = [...reply.adaptations.filter(a => !a.startsWith("SAFETY")), "DEVELOPMENTAL_ADAPTATION", "GENERAL_KNOWLEDGE_ANSWER", ...reply.adaptations.filter(a => a.startsWith("SAFETY"))];
          reply.used = [`Your selected age range: ${profile.age}.`, `Your detail preference: ${profile.detail}.`];
          reply.changed = [`Wrote the answer for ages ${profile.age}.`, "Answered from general model knowledge because no approved content matched."];
        }
      }
    } catch { /* fall back to built-in text */ }
  }
  reply.id = Math.random().toString(36).slice(2, 10);
  reply.ts = new Date().toISOString();
  reply.model = model;
  reply.promptVersion = PROMPT_VERSION;
  reply.metrics = metrics(reply.text);
  if (topic) reply.coverage = coverage(reply.text, [topic.title, ...topic.terms]);
  return NextResponse.json(reply);
}
