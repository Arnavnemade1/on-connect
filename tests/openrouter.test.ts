import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { generate, generateStream, health, pickLLM } from "@/lib/llm";

let srv: Server; let seen: { auth?: string; body?: any } = {}; let status = 200;
beforeAll(async () => {
  srv = createServer((req, res) => { let b = ""; req.on("data", c => (b += c)); req.on("end", () => {
    seen = { auth: req.headers.authorization, body: JSON.parse(b || "{}") };
    if (status !== 200) { res.statusCode = status; return res.end("{}"); }
    if (seen.body.stream) { res.setHeader("content-type", "text/event-stream"); res.write(": OPENROUTER PROCESSING\n\n"); for (const d of ["Hel", "lo"]) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: d } }] })}\n\n`); return res.end("data: [DONE]\n\n"); }
    res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ choices: [{ message: { content: "ok" } }] })); }); });
  await new Promise<void>(r => srv.listen(0, r));
  process.env.OPENROUTER_BASE = `http://127.0.0.1:${(srv.address() as any).port}`;
});
afterAll(() => { srv.close(); for (const k of ["OPENROUTER_BASE", "OPENROUTER_API_KEY", "GEMINI_API_KEY", "LLM_PROVIDER", "OPENROUTER_MODEL"]) delete process.env[k]; });

describe("provider selection", () => {
  it("is null with no keys", () => { delete process.env.OPENROUTER_API_KEY; delete process.env.GEMINI_API_KEY; delete process.env.LLM_PROVIDER; expect(pickLLM()).toBeNull(); });
  it("uses gemini when only that key is set", () => { process.env.GEMINI_API_KEY = "g"; expect(pickLLM()?.name).toBe("gemini"); });
  it("prefers openrouter when both are set", () => { process.env.OPENROUTER_API_KEY = "o"; expect(pickLLM()?.name).toBe("openrouter"); });
  it("honours LLM_PROVIDER", () => { process.env.LLM_PROVIDER = "gemini"; expect(pickLLM()?.name).toBe("gemini"); process.env.LLM_PROVIDER = "openrouter"; expect(pickLLM()?.name).toBe("openrouter"); delete process.env.LLM_PROVIDER; });
  it("ignores a blank key", () => { process.env.OPENROUTER_API_KEY = "  "; expect(pickLLM()?.name).toBe("gemini"); process.env.OPENROUTER_API_KEY = "o"; });
});

describe("openrouter calls", () => {
  it("sends a bearer key, the model and mapped roles", async () => {
    process.env.OPENROUTER_MODEL = "test/model"; const llm = pickLLM()!;
    const r = await generate(llm, "sys", [{ role: "user", text: "a" }, { role: "model", text: "b" }, { role: "user", text: "c" }]);
    expect(r.text).toBe("ok"); expect(seen.auth).toBe("Bearer o"); expect(seen.body.model).toBe("test/model");
    expect(seen.body.messages.map((m: any) => m.role)).toEqual(["system", "user", "assistant", "user"]);
  });
  it("streams deltas and skips keep-alives", async () => {
    const parts: string[] = []; const r = await generateStream(pickLLM()!, "sys", [{ role: "user", text: "hi" }], d => parts.push(d));
    expect(parts).toEqual(["Hel", "lo"]); expect(r.text).toBe("Hello");
  });
  it("reports auth, credit and server failures in health", async () => {
    status = 401; expect((await health()).status).toBe("API key rejected by OpenRouter");
    process.env.OPENROUTER_API_KEY = "o2"; status = 402; expect((await health()).status).toBe("OpenRouter account has no credits");
    process.env.OPENROUTER_API_KEY = "o3"; status = 200; const h = await health(); expect(h.ok).toBe(true); expect(h.provider).toBe("openrouter");
  });
});
