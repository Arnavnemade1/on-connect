// Re-checks every source link in lib/sources.ts and records status, final URL and page title in data/source-check.json.
// Run: npm run check:sources
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(new URL("../lib/sources.ts", import.meta.url), "utf8");
const items = [...src.matchAll(/\{ id: "([^"]+)", title: "[^"]*", org: "[^"]*", url: "([^"]+)"/g)].map(m => ({ id: m[1], url: m[2] }));
const title = html => { const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i); return m ? m[1].replace(/\s+/g, " ").trim().slice(0, 120) : ""; };
const results = [];
for (const it of items) {
  try { const r = await fetch(it.url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 OnconnectSourceCheck/1.0" }, signal: AbortSignal.timeout(20000) }); const body = await r.text(); results.push({ id: it.id, url: it.url, status: r.status, finalUrl: r.url, title: title(body) }); }
  catch (e) { results.push({ id: it.id, url: it.url, status: 0, finalUrl: "", title: "", error: String(e?.name ?? e) }); }
  process.stdout.write(`${results.at(-1).status} ${it.id}\n`);
}
writeFileSync(new URL("../data/source-check.json", import.meta.url), JSON.stringify({ checked: new Date().toISOString().slice(0, 10), results }, null, 2) + "\n");
const bad = results.filter(r => r.status !== 200); console.log(`${results.length - bad.length}/${results.length} resolve`); if (bad.length) process.exitCode = 1;
