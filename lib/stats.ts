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

// ---- additions: nonparametric tests, bootstrap, agreement, power ----
const erf = (x: number) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
export const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
/** Inverse normal CDF (Acklam's approximation, |error| < 1.2e-9). */
export function normInv(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425; let q: number, r: number;
  if (p < lo) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
/** Mann–Whitney U with tie correction and continuity correction (normal approximation), plus rank-biserial effect size. */
export function mannWhitney(a: number[], b: number[]) {
  const n1 = a.length, n2 = b.length; if (n1 < 2 || n2 < 2) return null;
  const all = [...a.map(v => ({ v, g: 0 })), ...b.map(v => ({ v, g: 1 }))].sort((x, y) => x.v - y.v); const ranks = new Array(all.length); let tieTerm = 0;
  for (let i = 0; i < all.length;) { let j = i; while (j + 1 < all.length && all[j + 1].v === all[i].v) j++; const r = (i + j) / 2 + 1; for (let k = i; k <= j; k++) ranks[k] = r; const t = j - i + 1; tieTerm += t ** 3 - t; i = j + 1; }
  const R1 = all.reduce((s, x, i) => s + (x.g === 0 ? ranks[i] : 0), 0); const U1 = R1 - n1 * (n1 + 1) / 2; const U = Math.min(U1, n1 * n2 - U1);
  const N = n1 + n2; const mu = n1 * n2 / 2; const sigma = Math.sqrt((n1 * n2 / 12) * (N + 1 - tieTerm / (N * (N - 1)))); if (!sigma) return null;
  const z = (Math.abs(U1 - mu) - 0.5) / sigma; const p = Math.min(1, 2 * (1 - normCdf(Math.max(0, z))));
  return { U: U1, z, p, rankBiserial: 1 - 2 * U1 / (n1 * n2), n1, n2 };
}
/** Percentile bootstrap CI for a statistic of one sample. Deterministic (seeded) so reports are reproducible. */
export function bootstrapCI(x: number[], stat: (s: number[]) => number = mean, B = 2000, alpha = 0.05, seed = 12345): [number, number] {
  if (x.length < 2) return [NaN, NaN]; let s = seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out: number[] = []; for (let i = 0; i < B; i++) { const r = new Array(x.length); for (let j = 0; j < x.length; j++) r[j] = x[Math.floor(rnd() * x.length)]; out.push(stat(r)); }
  out.sort((p, q) => p - q); return [out[Math.floor(B * alpha / 2)], out[Math.min(B - 1, Math.floor(B * (1 - alpha / 2)))]];
}
/** Hedges' g: Cohen's d with the small-sample correction. */
export function hedgesG(a: number[], b: number[]) { const r = welch(a, b); if (!r) return NaN; const df = a.length + b.length - 2; return r.d * (1 - 3 / (4 * df - 1)); }
/** Cohen's kappa for two raters on categorical labels; quadratic-weighted if `ordinal` (labels are numbers). */
export function cohenKappa(r1: (string | number)[], r2: (string | number)[], ordinal = false) {
  const n = Math.min(r1.length, r2.length); if (n < 2) return null;
  const cats = [...new Set([...r1.slice(0, n), ...r2.slice(0, n)])].sort((x, y) => (ordinal ? Number(x) - Number(y) : String(x).localeCompare(String(y)))); const k = cats.length; if (k < 2) return { kappa: 1, observed: 1, n, k };
  const idx = new Map(cats.map((c, i) => [c, i])); const O = Array.from({ length: k }, () => new Array(k).fill(0)); for (let i = 0; i < n; i++) O[idx.get(r1[i])!][idx.get(r2[i])!]++;
  const rs = O.map(r => r.reduce((a, b) => a + b, 0)), cs = cats.map((_, j) => O.reduce((a, r) => a + r[j], 0));
  const w = (i: number, j: number) => (ordinal ? 1 - ((i - j) / (k - 1)) ** 2 : i === j ? 1 : 0);
  let po = 0, pe = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { po += w(i, j) * O[i][j] / n; pe += w(i, j) * rs[i] * cs[j] / (n * n); }
  return { kappa: pe === 1 ? 1 : (po - pe) / (1 - pe), observed: po, n, k };
}
export const kappaLabel = (k: number) => k < 0 ? "poor" : k < .2 ? "slight" : k < .4 ? "fair" : k < .6 ? "moderate" : k < .8 ? "substantial" : "almost perfect";
/** Cronbach's alpha for a matrix (rows = respondents, cols = items). */
export function cronbachAlpha(rows: number[][]) { const k = rows[0]?.length ?? 0; if (rows.length < 2 || k < 2) return NaN; const col = (j: number) => rows.map(r => r[j]); const sv = Array.from({ length: k }, (_, j) => sd(col(j)) ** 2).reduce((a, b) => a + b, 0); const tv = sd(rows.map(r => r.reduce((a, b) => a + b, 0))) ** 2; return tv ? (k / (k - 1)) * (1 - sv / tv) : NaN; }
/** Per-group sample size for a two-sided independent-samples t-test (normal approximation + small-sample correction). */
export function nPerGroup(d: number, power = 0.8, alpha = 0.05) { if (!d) return Infinity; const za = normInv(1 - alpha / 2), zb = normInv(power); return Math.ceil(2 * ((za + zb) / d) ** 2 + za * za / 4); }
/** Achieved power for given n per group and effect size d (normal approximation). */
export function powerFor(d: number, n: number, alpha = 0.05) { const za = normInv(1 - alpha / 2); const ncp = Math.abs(d) * Math.sqrt(n / 2); return normCdf(ncp - za) + normCdf(-ncp - za); }
/** Smallest effect (d) detectable with n per group at the given power. */
export function mdes(n: number, power = 0.8, alpha = 0.05) { return (normInv(1 - alpha / 2) + normInv(power)) * Math.sqrt(2 / n); }
export function holm(ps: number[]) { const idx = ps.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p); const out = new Array(ps.length); let run = 0; idx.forEach((x, r) => { run = Math.max(run, Math.min(1, x.p * (ps.length - r))); out[x.i] = run; }); return out as number[]; }

/** Pairs needed for a paired / within-subject t-test on standardised difference dz. */
export function nPaired(dz: number, power = 0.8, alpha = 0.05) { if (!dz) return Infinity; const za = normInv(1 - alpha / 2), zb = normInv(power); return Math.ceil(((za + zb) / dz) ** 2 + za * za / 2); }
