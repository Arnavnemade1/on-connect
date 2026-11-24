// Thin Gemini REST client. Server-side only. The base URL can be overridden (GEMINI_BASE) so tests can point at a mock.
export const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const BASE = () => process.env.GEMINI_BASE || "https://generativelanguage.googleapis.com/v1beta";

export interface Turn { role: "user" | "model"; text: string; }
const toContents = (turns: Turn[]) => turns.map(t => ({ role: t.role, parts: [{ text: t.text }] }));
const headers = (key: string) => ({ "x-goog-api-key": key, "content-type": "application/json" });
const body = (system: string, turns: Turn[], maxOutputTokens: number) => JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: toContents(turns), generationConfig: { maxOutputTokens } });

export interface GenResult { text?: string; error?: string; ms: number; }

/** One-shot generation with a single retry and a hard timeout. */
export async function generate(key: string, system: string, turns: Turn[], opts: { timeout?: number; maxOutputTokens?: number } = {}): Promise<GenResult> {
  const t0 = Date.now();
  const call = () => fetch(`${BASE()}/models/${MODEL}:generateContent`, { method: "POST", signal: AbortSignal.timeout(opts.timeout ?? 25000), headers: headers(key), body: body(system, turns, opts.maxOutputTokens ?? 2000) });
  try {
    let r = await call();
    if (!r.ok && r.status !== 401 && r.status !== 403 && r.status !== 400) { await new Promise(res => setTimeout(res, 800)); r = await call(); }
    const j = await r.json().catch(() => null);
    if (!r.ok) return { error: `HTTP ${r.status}`, ms: Date.now() - t0 };
    const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    return text ? { text, ms: Date.now() - t0 } : { error: j?.promptFeedback?.blockReason ? `blocked (${j.promptFeedback.blockReason})` : "empty response", ms: Date.now() - t0 };
  } catch (e) { return { error: e instanceof Error ? e.name : "failed", ms: Date.now() - t0 }; }
}

/** Streaming generation. Calls onDelta for every chunk. Resolves with the full text or an error (partial text is kept). */
export async function generateStream(key: string, system: string, turns: Turn[], onDelta: (d: string) => void, opts: { timeout?: number; maxOutputTokens?: number; signal?: AbortSignal } = {}): Promise<GenResult & { firstTokenMs?: number }> {
  const t0 = Date.now(); let full = ""; let first: number | undefined;
  try {
    const signal = opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(opts.timeout ?? 40000)]) : AbortSignal.timeout(opts.timeout ?? 40000);
    const r = await fetch(`${BASE()}/models/${MODEL}:streamGenerateContent?alt=sse`, { method: "POST", signal, headers: headers(key), body: body(system, turns, opts.maxOutputTokens ?? 2000) });
    if (!r.ok || !r.body) return { error: `HTTP ${r.status}`, ms: Date.now() - t0 };
    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
    const take = (line: string) => {
      if (!line.startsWith("data:")) return;
      const payload = line.slice(5).trim(); if (!payload || payload === "[DONE]") return;
      try { const j = JSON.parse(payload); const d = (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join(""); if (d) { first ??= Date.now() - t0; full += d; onDelta(d); } } catch { /* ignore keep-alives */ }
    };
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number; while ((i = buf.search(/\r?\n/)) >= 0) { take(buf.slice(0, i)); buf = buf.slice(i + (buf[i] === "\r" ? 2 : 1)); }
    }
    if (buf) take(buf);
    return full ? { text: full, ms: Date.now() - t0, firstTokenMs: first } : { error: "empty response", ms: Date.now() - t0 };
  } catch (e) { return full ? { text: full, error: e instanceof Error ? e.name : "failed", ms: Date.now() - t0, firstTokenMs: first } : { error: e instanceof Error ? e.name : "failed", ms: Date.now() - t0 }; }
}

/** Cheap liveness probe, cached for a minute so it never burns quota. */
let cache: { at: number; value: { ok: boolean; status: string } } | null = null;
export async function health(key: string | undefined): Promise<{ ok: boolean; status: string; model: string }> {
  if (!key) return { ok: false, status: "no API key configured", model: MODEL };
  if (cache && Date.now() - cache.at < 60000) return { ...cache.value, model: MODEL };
  const r = await generate(key, "Reply with the single word: ok", [{ role: "user", text: "ping" }], { timeout: 8000, maxOutputTokens: 64 });
  const value = r.text ? { ok: true, status: `online (${r.ms}ms)` } : { ok: false, status: r.error === "HTTP 401" || r.error === "HTTP 403" ? "API key rejected by Google" : `unavailable (${r.error})` };
  cache = { at: Date.now(), value }; return { ...value, model: MODEL };
}
