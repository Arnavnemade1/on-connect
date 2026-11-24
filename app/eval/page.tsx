"use client";
import { useRef, useState } from "react";
import { useLocal } from "@/lib/store";
import { AGES, BANK, CONDLABEL, CONDS, MEM_QS, delta, runsCsv, summarise, summariseMem, targetGrade, type Cond, type MemRun, type Run } from "@/lib/eval";
import { DEFAULT_MEMORY, type Memory } from "@/lib/memory";

const pct = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) + "%" : "–");
const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "–");
const pv = (p: number) => (p < 0.001 ? "< .001" : p.toFixed(3));
const dl = (n: string, t: string, type: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type })); a.download = n; a.click(); };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const PROFILE = (age: string) => ({ role: "child", age, detail: "balanced", format: ["define", "examples"], topics: [], concerns: [], notes: "", updatedAt: "", lang: "en" });
const COLOR: Record<Cond, string> = { baseline: "#B7791F", age: "#8E6BD1", adaptive: "var(--blue)" };

async function post(body: object, retries = 4): Promise<any | null> {
  for (let i = 0; i <= retries; i++) {
    const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (r?.status === 429) { await sleep(4000); continue; }
    if (!r || !r.ok) return null; return r.json();
  } return null;
}

export default function Eval() {
  const [runs, setRuns, ready] = useLocal<Run[]>("onc.eval", []);
  const [mruns, setMruns] = useLocal<MemRun[]>("onc.evalmem", []);
  const [tab, setTab] = useState<"ablation" | "memory" | "repro">("ablation");
  const [running, setRunning] = useState(false); const [done, setDone] = useState(0); const [total, setTotal] = useState(0); const [quick, setQuick] = useState(true); const [stamp, setStamp] = useLocal<string>("onc.evalstamp", "");
  const stopRef = useRef(false);

  async function call(q: string, age: string, cond: Cond): Promise<Run | null> {
    if (stopRef.current) return null; const t0 = Date.now(); const j = await post({ question: q, lastTopic: null, mode: cond, profile: PROFILE(age) });
    const base = { q, age: age as Run["age"], cond };
    if (!j) return { ...base, id: "", topic: false, grade: 0, words: 0, coverage: null, model: "", ms: Date.now() - t0, err: "request failed" };
    return { ...base, id: j.id, topic: !!j.topicId, grade: j.metrics.grade, words: j.metrics.words, coverage: j.coverage ?? null, model: j.model, ms: Date.now() - t0, err: null };
  }
  async function pool<T, R>(jobs: T[], work: (j: T) => Promise<R | null>, onItem: (r: R) => void) {
    let next = 0, n = 0; const w = async () => { while (next < jobs.length && !stopRef.current) { const j = jobs[next++]; const r = await work(j); if (r) onItem(r); setDone(++n); } }; await Promise.all([w(), w(), w()]);
  }
  async function startAblation() {
    stopRef.current = false; setRunning(true); setRuns([]); setDone(0);
    const qs = quick ? BANK.filter((_, i) => i % 2 === 0) : BANK; const jobs = qs.flatMap(b => AGES.flatMap(a => CONDS.map(c => ({ q: b.q, a, c })))); setTotal(jobs.length); const acc: Run[] = [];
    await pool(jobs, j => call(j.q, j.a, j.c), r => { acc.push(r); setRuns([...acc]); }); setStamp(new Date().toISOString()); setRunning(false);
  }
  async function startMemory() {
    stopRef.current = false; setRunning(true); setMruns([]); setDone(0);
    const qs = quick ? MEM_QS.filter((_, i) => i % 3 === 0) : MEM_QS; const jobs = qs.flatMap(q => AGES.map(a => ({ q, a }))); setTotal(jobs.length); const acc: MemRun[] = [];
    // Each job is one scripted conversation: T1 ask → T2 "I don't understand" → T3 neutral follow-up, with the memory either carried forward or wiped before T3.
    const work = async ({ q, a }: { q: string; a: string }): Promise<MemRun | null> => {
      const t1 = await post({ question: q, lastTopic: null, profile: PROFILE(a), memory: DEFAULT_MEMORY, stream: false }); if (!t1) return null;
      const h1 = [{ role: "user", text: q }, { role: "bot", text: t1.text }]; const q2 = "I don't understand, can you explain it more simply?";
      const t2 = await post({ question: q2, lastTopic: t1.topicId, profile: PROFILE(a), memory: t1.memory, history: h1 }); if (!t2) return null;
      const h2 = [...h1, { role: "user", text: q2 }, { role: "bot", text: t2.text }]; const q3 = "Can you tell me what happens next?";
      for (const cond of ["carried", "reset"] as const) {
        const t3 = await post({ question: q3, lastTopic: t1.topicId, profile: PROFILE(a), memory: cond === "carried" ? t2.memory as Memory : DEFAULT_MEMORY, history: h2 });
        const row: MemRun = t3 ? { q, age: a as MemRun["age"], cond, g1: t1.metrics.grade, g3: t3.metrics.grade, w1: t1.metrics.words, w3: t3.metrics.words, model: t3.model, err: null } : { q, age: a as MemRun["age"], cond, g1: 0, g3: 0, w1: 0, w3: 0, model: "", err: "request failed" };
        acc.push(row); setMruns([...acc]);
      } return null;
    };
    await pool(jobs, work, () => {}); setStamp(new Date().toISOString()); setRunning(false);
  }
  if (!ready) return null;
  const S = summarise(runs); const M = summariseMem(mruns); const has = runs.length > 0; const hasM = mruns.length > 0;
  const models = [...new Set([...S.models, ...M.models])]; const templateOnly = models.length > 0 && models.every(m => m === "onconnect-templates");
  const W = 540, H = 230, px = (i: number) => 52 + i * ((W - 84) / 3), py = (g: number) => H - 32 - (g / 14) * (H - 54);
  const line = (k: "adaptive" | "baseline" | "age_only") => S.perAge.map((a, i) => Number.isFinite(a[k]) ? `${i ? "L" : "M"}${px(i)},${py(a[k])}` : "").join(" ");
  const sig = (p: number, good: boolean) => p < 0.05 ? (good ? "better, reliably" : "worse, reliably") : "no reliable difference";

  return (<>
    <div className="eyebrow">Research · Evaluation harness</div><h1>Does adaptation actually change the answer?</h1>
    <p>Two pre-scripted experiments you can re-run on demand. Experiment 1 is an <b>ablation</b>: control vs age band only vs full profile. Experiment 2 tests whether <b>chat memory persists</b> after a child says &ldquo;I don&apos;t understand&rdquo;. Everything is measured automatically, so the result is a number you can re-check.</p>
    {templateOnly && <div className="callout"><b>These results measure the built-in template engine, not the AI model.</b> The model was unavailable during the run. Re-run once it is online before citing anything.</div>}
    <div className="tabs" role="tablist">{([["ablation", "1 · Ablation"], ["memory", "2 · Memory persistence"], ["repro", "Reproducibility card"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>

    {tab !== "repro" && <div className="card">
      <label style={{ margin: 0, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={quick} onChange={e => setQuick(e.target.checked)} disabled={running} />
        {tab === "ablation" ? `Quick run (${Math.ceil(BANK.length / 2)} questions × 4 ages × 3 arms = ${Math.ceil(BANK.length / 2) * 12} calls)` : `Quick run (${Math.ceil(MEM_QS.length / 3)} topics × 4 ages × 3 turns + 1 extra branch ≈ ${Math.ceil(MEM_QS.length / 3) * 16} calls)`}</label>
      <div className="row">
        {!running ? <button className="btn" onClick={tab === "ablation" ? startAblation : startMemory}>{(tab === "ablation" ? has : hasM) ? "Re-run" : "Run"} experiment {tab === "ablation" ? 1 : 2}</button> : <button className="btn alt" onClick={() => { stopRef.current = true; }}>Stop</button>}
        {tab === "ablation" && <><button className="btn alt" disabled={!has} onClick={() => dl("onconnect-eval-runs.csv", runsCsv(runs), "text/csv")}>Export CSV</button><button className="btn alt" disabled={!has} onClick={() => dl("onconnect-eval-summary.json", JSON.stringify({ generated: stamp, models, summary: S, runs }, null, 2), "application/json")}>Export JSON</button></>}
        {tab === "memory" && <button className="btn alt" disabled={!hasM} onClick={() => dl("onconnect-eval-memory.json", JSON.stringify({ generated: stamp, models, summary: M, runs: mruns }, null, 2), "application/json")}>Export JSON</button>}
        <button className="btn alt" disabled={running || !(tab === "ablation" ? has : hasM)} onClick={() => (tab === "ablation" ? setRuns([]) : setMruns([]))}>Clear</button></div>
      {(running || total > 0) && <><div className="progress" style={{ marginTop: 14 }}><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div><p className="muted" style={{ margin: 0 }}>{done} / {total} {tab === "memory" ? "conversations" : "calls"}{(tab === "ablation" ? S.failed : M.failed) ? ` · ${tab === "ablation" ? S.failed : M.failed} failed` : ""}</p></>}
    </div>}

    {tab === "ablation" && has && <>
      <div className="card"><div className="eyebrow">Result</div><h2>Reading-level fit by arm</h2>
        <p className="muted">Absolute distance between each answer&apos;s Flesch–Kincaid grade and the target for that age band (lower is better). Intervals are 95% bootstrap CIs.</p>
        <div className="wrap"><table><thead><tr><th>Arm</th><th>n</th><th>Grade error</th><th>95% CI</th><th>Within ±2</th><th>Within words</th><th>Coverage</th><th>Words</th></tr></thead><tbody>
          {CONDS.map(c => { const x = S[c === "age" ? "age" : c]; return <tr key={c}><td><b style={{ color: COLOR[c] }}>●</b> {CONDLABEL[c]}</td><td>{x.n}</td><td><b>{f(x.err)}</b> ± {f(x.errSd)}</td><td>{f(x.errCi[0])} – {f(x.errCi[1])}</td><td>{pct(x.band)}</td><td>{pct(x.cap)}</td><td>{f(x.cov)}</td><td>{f(x.words, 0)}</td></tr>; })}</tbody></table></div>
        <h3 style={{ marginTop: 20 }}>Pairwise tests on grade error</h3>
        <div className="wrap"><table><thead><tr><th>Comparison</th><th>Δ error</th><th>Welch <i>t</i></th><th><i>p</i></th><th><i>p</i> (Holm)</th><th>Cohen&apos;s <i>d</i></th><th>Mann–Whitney <i>p</i></th><th>Reading</th></tr></thead><tbody>
          {S.pairs.map(r => <tr key={r.x + r.y}><td>{CONDLABEL[r.x]} vs {CONDLABEL[r.y]}</td>{r.w ? <><td>{f(r.w.diff)}</td><td>{f(r.w.t)} (df {f(r.w.df, 1)})</td><td>{pv(r.w.p)}</td><td>{pv(r.pHolm)}</td><td>{f(r.w.d)}</td><td>{r.mw ? pv(r.mw.p) : "–"}</td><td>{sig(r.pHolm, r.w.diff < 0)}</td></> : <td colSpan={7} className="muted">not enough runs</td>}</tr>)}</tbody></table></div>
        <p className="muted">Three comparisons, so the Holm column is the one to cite. Negative Δ means the first arm is closer to target. Mann–Whitney is shown because grade error is not normally distributed.</p></div>
      <div className="card"><div className="eyebrow">Figure</div><h2>Does the answer move with the reader?</h2>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 640 }} role="img" aria-label="Mean reading grade by age band for each arm and the target">
          {[0, 4, 8, 12].map(g => <g key={g}><line x1={42} x2={W - 30} y1={py(g)} y2={py(g)} stroke="var(--line)" /><text x={34} y={py(g) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{g}</text></g>)}
          {AGES.map((a, i) => <text key={a} x={px(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">{a}</text>)}
          <path d={AGES.map((a, i) => `${i ? "L" : "M"}${px(i)},${py(targetGrade(a))}`).join(" ")} fill="none" stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1.5" />
          {([["baseline", "baseline"], ["age_only", "age"], ["adaptive", "adaptive"]] as const).map(([k, c]) => <g key={k}><path d={line(k)} fill="none" stroke={COLOR[c]} strokeWidth="2.5" />{S.perAge.map((a, i) => Number.isFinite(a[k]) && <circle key={i} cx={px(i)} cy={py(a[k])} r="4" fill={COLOR[c]} />)}</g>)}
        </svg>
        <div className="legend">{CONDS.map(c => <span key={c}><b style={{ color: COLOR[c] }}>━</b> {CONDLABEL[c]}</span>)}<span>┅ Target grade</span></div>
        <p className="muted">If adaptation works, the coloured lines should climb with the dashed target; the control should stay flat. If &ldquo;age band only&rdquo; already matches &ldquo;full profile&rdquo;, the extra ingredients are not adding reading-level fit (they may still add other things, such as examples).</p></div>
    </>}

    {tab === "memory" && hasM && <div className="card"><div className="eyebrow">Result</div><h2>Does the model remember that the reader was confused?</h2>
      <p className="muted">Scripted conversation: ask about a topic, say &ldquo;I don&apos;t understand, can you explain it more simply?&rdquo;, then ask a neutral follow-up. We compare the follow-up&apos;s reading grade to the first answer&apos;s, with the memory <b>carried forward</b> versus <b>wiped</b>. If memory works, the carried arm drops; the wiped arm snaps back.</p>
      <div className="kpi"><div><b>{f(M.carried.mean)}</b><span>Δ grade, memory carried (n={M.carried.n})</span></div><div><b>{f(M.reset.mean)}</b><span>Δ grade, memory wiped (n={M.reset.n})</span></div><div><b>{M.t ? pv(M.t.p) : "–"}</b><span>Welch p</span></div><div><b>{M.t ? f(M.t.d) : "–"}</b><span>Cohen&apos;s d</span></div></div>
      <div className="wrap"><table><thead><tr><th>Arm</th><th>n</th><th>Mean Δ grade (T3 − T1)</th><th>95% bootstrap CI</th><th>Mean Δ words</th></tr></thead><tbody>
        <tr><td>Memory carried</td><td>{M.carried.n}</td><td>{f(M.carried.mean)} ± {f(M.carried.sd)}</td><td>{f(M.carried.ci[0])} – {f(M.carried.ci[1])}</td><td>{f(M.wordsCarried, 0)}</td></tr>
        <tr><td>Memory wiped</td><td>{M.reset.n}</td><td>{f(M.reset.mean)} ± {f(M.reset.sd)}</td><td>{f(M.reset.ci[0])} – {f(M.reset.ci[1])}</td><td>{f(M.wordsReset, 0)}</td></tr></tbody></table></div>
      {M.t && <p>{M.t.p < 0.05 && M.carried.mean < M.reset.mean ? "Memory persistence lowers the reading level of later answers, as designed." : M.t.p < 0.05 ? "The wiped arm is lower than the carried arm: the memory is not helping and this needs investigating." : "No reliable difference between carried and wiped memory in this run."} Mann–Whitney p {M.mw ? pv(M.mw.p) : "–"}.</p>}
      <p className="muted">Caveat: both arms share the same first two turns, so differences come only from the stored state. The &ldquo;simpler&rdquo; signal is detected from the child&apos;s own words (regex), so this tests the memory mechanism, not whether children say it.</p></div>}

    {tab === "repro" && <div className="card"><div className="eyebrow">Reproducibility card</div><h2>What produced these numbers</h2>
      <p className="muted">Copy this into any write-up so a reader can rerun the experiment.</p>
      <div className="wrap"><table><tbody>
        <tr><th>Run date</th><td>{stamp ? new Date(stamp).toLocaleString() : "no run yet"}</td></tr><tr><th>Model(s) observed</th><td>{models.join(", ") || "–"}</td></tr>
        <tr><th>Prompt version</th><td>adaptive-v0.5 · baseline-v1 · adaptive-v0.5+age-only</td></tr><tr><th>Question bank</th><td>{BANK.length} questions ({BANK.filter(b => b.topic).length} curated-topic, {BANK.filter(b => !b.topic).length} general), fixed in <code>lib/eval.ts</code></td></tr>
        <tr><th>Design</th><td>Experiment 1: 3 arms × 4 age bands × questions, balanced detail, same profile formats (define, examples). Experiment 2: 3-turn scripted conversation, memory carried vs wiped before turn 3.</td></tr>
        <tr><th>Outcome measures</th><td>Flesch–Kincaid grade error vs band target (3, 5.5, 8, 11), word-cap compliance (≤1.3 × 140), key-concept coverage, Δ grade across turns</td></tr>
        <tr><th>Statistics</th><td>Welch t (Cohen&apos;s d), Mann–Whitney U (tie- and continuity-corrected), percentile bootstrap CI (2000 resamples, seeded), Holm correction across the three arm comparisons</td></tr>
        <tr><th>Sampling</th><td>Temperature and seed are the model defaults, so output varies run to run. Report several runs.</td></tr>
        <tr><th>Software</th><td>Next.js app · tests: <code>npm test</code> (56+ unit and integration tests, including the statistics)</td></tr></tbody></table></div>
      <div className="row"><button className="btn alt" onClick={() => navigator.clipboard?.writeText(`Onconnect evaluation. Run ${stamp || "n/a"}. Models: ${models.join(", ") || "n/a"}. Prompts: adaptive-v0.5, baseline-v1. Bank: ${BANK.length} fixed questions x 4 age bands x 3 arms. Measures: Flesch-Kincaid grade error vs band target, word-cap compliance, concept coverage; Welch t, Mann-Whitney U, 2000-resample bootstrap CI, Holm correction.`)}>Copy as text</button></div></div>}

    <div className="card"><div className="eyebrow">Read this before citing a number</div><h2>What this does and does not show</h2>
      <ul><li>It measures an <b>automated readability proxy</b> (Flesch–Kincaid) and a keyword coverage heuristic. It does <b>not</b> measure whether a child understood anything. The Comprehension study page is for that, and it needs ethics approval first.</li>
        <li>The control uses the same model and facts but no age, notes or memory, so the comparison isolates adaptation. A stronger control would be a single fixed &ldquo;explain like I&apos;m 10&rdquo; prompt, and a human-written text.</li>
        <li>Runs are not independent: questions repeat across arms and ages. The Welch test treats them as independent, so treat <i>p</i>-values as indicative. A mixed-effects model with question as a random effect is the right analysis.</li>
        <li>LLM output varies run to run, so re-run and report the spread. Flesch–Kincaid is English-only and rewards short words, not clarity.</li></ul></div>
  </>);
}
