export const mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
export const sd = (a: number[]) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function lgamma(x: number) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const ci of c) s += ci / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
function betacf(a: number, b: number, x: number) { const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
function betai(a: number, b: number, x: number) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
export function welch(a: number[], b: number[]) {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a), mb = mean(b), va = sd(a) ** 2, vb = sd(b) ** 2, se = Math.sqrt(va / a.length + vb / b.length);
  if (!se) return null;
  const t = (ma - mb) / se; const df = (va / a.length + vb / b.length) ** 2 / ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1));
  const p = betai(df / 2, 0.5, df / (df + t * t));
  const sp = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
  const d = sp ? (ma - mb) / sp : NaN;
  return { t, df, p, d, diff: ma - mb, ci: [ma - mb - 1.96 * se, ma - mb + 1.96 * se] as [number, number] };
}
