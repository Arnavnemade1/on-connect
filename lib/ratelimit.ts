// Small in-memory token bucket per client. Good enough to stop a runaway loop; serverless instances don't share memory,
// so this is a safeguard, not a security boundary. Put a real limiter (e.g. Vercel Firewall rate limiting) in front for production.
const buckets = new Map<string, { n: number; at: number }>();
export function limited(ip: string, max = 120, windowMs = 60_000): boolean {
  const now = Date.now(); const b = buckets.get(ip);
  if (!b || now - b.at > windowMs) { buckets.set(ip, { n: 1, at: now }); if (buckets.size > 5000) buckets.clear(); return false; }
  b.n++; return b.n > max;
}
export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
