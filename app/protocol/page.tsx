"use client";
import { useMemo, useState } from "react";
import { useLocal } from "@/lib/store";
import { mdes, nPaired, nPerGroup, powerFor } from "@/lib/stats";
import { blockRandomise, CONSENT, ETHICS, latinSquare, PROTOCOL_DEFAULT, protocolMd, type Protocol } from "@/lib/protocol";

const dl = (n: string, t: string, type = "text/markdown") => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type })); a.download = n; a.click(); };
const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "–");
type Tab = "design" | "power" | "random" | "ethics" | "forms";

export default function Protocol() {
  const [p, setP, ready] = useLocal<Protocol>("onc.protocol", PROTOCOL_DEFAULT); const [done, setDone] = useLocal<Record<string, boolean>>("onc.ethics", {});
  const [tab, setTab] = useState<Tab>("design"); const [nTotal, setNTotal] = useState(60); const [age, setAge] = useState("13-15");
  const between = p.design === "between"; const nGroup = between ? nPerGroup(p.d, p.power, p.alpha) : nPaired(p.d, p.power, p.alpha);
  const total = Math.ceil((between ? nGroup * 2 : nGroup) / (1 - p.attrition / 100));
  const set = <K extends keyof Protocol>(k: K, v: Protocol[K]) => setP({ ...p, [k]: v });
  const alloc = useMemo(() => { try { return blockRandomise(nTotal, p.arms.split(",").map(x => x.trim()).filter(Boolean), p.block, p.strata.split(",").map(x => x.trim()).filter(Boolean), p.seed); } catch (e) { return e as Error; } }, [nTotal, p.arms, p.block, p.strata, p.seed]);
  if (!ready) return null;
  const W = 520, H = 200, ns = Array.from({ length: 40 }, (_, i) => 5 + i * 5); const px = (n: number) => 44 + ((n - 5) / 195) * (W - 70), py = (v: number) => H - 26 - v * (H - 44);
  const ethicsDone = ETHICS.filter(e => done[e.id]).length;
  const T: [Tab, string][] = [["design", "Design"], ["power", "Power"], ["random", "Randomisation"], ["ethics", `Ethics ${ethicsDone}/${ETHICS.length}`], ["forms", "Consent forms"]];
  const Field = ({ k, label, rows = 2 }: { k: keyof Protocol; label: string; rows?: number }) => (<><label>{label}</label><textarea rows={rows} value={String(p[k])} onChange={e => set(k, e.target.value as never)} /></>);

  return (<>
    <div className="eyebrow">Research · Protocol</div><h1>Study protocol and power</h1>
    <p>Plan the human-participants study before collecting anything: hypotheses, outcomes, sample size, randomisation, and the ethics steps that have to happen first. Export it as a pre-registration draft.</p>
    <div className="callout"><b>Nothing here is approval.</b> Studies with children need review-board or school science review committee approval before recruitment. Children with cancer are a vulnerable population, so a student project should plan for healthy volunteers and a non-clinical topic, with clinicians reviewing the content. Check your fair&apos;s current human-participants rules.</div>
    <div className="tabs" role="tablist">{T.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>

    {tab === "design" && <div className="card"><h2>Design</h2>
      <label>Title</label><input type="text" value={p.title} onChange={e => set("title", e.target.value)} />
      <Field k="question" label="Research question" /><Field k="h1" label="Hypothesis 1 (primary)" /><Field k="h2" label="Hypothesis 2" /><Field k="h3" label="Hypothesis 3 (exploratory)" />
      <label>Design</label><div className="chips">{(["between", "within"] as const).map(d => <button key={d} className={"chip" + (p.design === d ? " on" : "")} onClick={() => set("design", d)}>{d === "between" ? "Between subjects (two groups)" : "Within subjects (each reads both)"}</button>)}</div>
      <Field k="primary" label="Primary outcome" /><Field k="secondary" label="Secondary outcomes" /><Field k="population" label="Participants" rows={3} /><Field k="exclusion" label="Exclusions" /><Field k="analysis" label="Analysis plan" rows={4} />
      <div className="row"><button className="btn" onClick={() => dl("onconnect-protocol.md", protocolMd(p, nGroup, total))}>Export protocol (Markdown)</button><button className="btn alt" onClick={() => setP(PROTOCOL_DEFAULT)}>Reset to template</button></div></div>}

    {tab === "power" && <><div className="card"><h2>Sample size</h2>
      <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr" }}><div><label>Expected effect size (Cohen&apos;s d): {p.d}</label><input type="range" min="0.1" max="1.2" step="0.05" value={p.d} onChange={e => set("d", Number(e.target.value))} />
        <p className="muted">Small 0.2, medium 0.5, large 0.8. Base it on prior work, not on what is convenient. A pilot study can estimate it.</p>
        <label>Power: {p.power}</label><input type="range" min="0.7" max="0.95" step="0.05" value={p.power} onChange={e => set("power", Number(e.target.value))} />
        <label>Alpha (two-sided): {p.alpha}</label><input type="range" min="0.01" max="0.1" step="0.01" value={p.alpha} onChange={e => set("alpha", Number(e.target.value))} />
        <label>Expected dropout: {p.attrition}%</label><input type="range" min="0" max="40" step="5" value={p.attrition} onChange={e => set("attrition", Number(e.target.value))} /></div>
        <div><div className="kpi" style={{ gridTemplateColumns: "1fr 1fr" }}><div><b>{nGroup}</b><span>{between ? "Per group" : "Participants"}</span></div><div><b>{total}</b><span>To recruit (with dropout)</span></div></div>
          <p className="muted">{between ? "Independent-samples t-test, two-sided." : "Paired t-test on within-person differences (d is the standardised difference)."} Normal approximation with a small-sample correction; matches standard tables to within one participant.</p>
          <p>With <b>{Math.floor(total / (between ? 2 : 1) * (1 - p.attrition / 100))}</b> {between ? "per group" : "participants"} left after dropout, the smallest effect you can detect at {Math.round(p.power * 100)}% power is d = <b>{f(mdes(Math.floor(total / (between ? 2 : 1) * (1 - p.attrition / 100)), p.power, p.alpha))}</b>.</p></div></div></div>
      <div className="card"><h2>Power curve</h2><svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 600 }} role="img" aria-label="Power against sample size per group">
        {[0, 0.25, 0.5, 0.75, 1].map(v => <g key={v}><line x1={44} x2={W - 26} y1={py(v)} y2={py(v)} stroke="var(--line)" /><text x={38} y={py(v) + 4} fontSize="10" textAnchor="end" fill="var(--muted)">{v}</text></g>)}
        {[50, 100, 150, 200].map(n => <text key={n} x={px(n)} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--muted)">{n}</text>)}
        <line x1={44} x2={W - 26} y1={py(p.power)} y2={py(p.power)} stroke="var(--muted)" strokeDasharray="4 4" />
        {[[0.3, "#8E6BD1"], [p.d, "var(--blue)"], [0.8, "#B7791F"]].map(([d, c], k) => <path key={k} fill="none" stroke={c as string} strokeWidth={k === 1 ? 2.8 : 1.6} d={ns.map((n, i) => `${i ? "L" : "M"}${px(n)},${py(powerFor(d as number, n, p.alpha))}`).join(" ")} />)}</svg>
        <div className="legend"><span><b style={{ color: "#8E6BD1" }}>━</b> d = 0.3</span><span><b style={{ color: "var(--blue)" }}>━</b> d = {p.d} (yours)</span><span><b style={{ color: "#B7791F" }}>━</b> d = 0.8</span><span>x: participants per group</span></div></div>
      <div className="card"><h2>Reference table</h2><div className="wrap"><table><thead><tr><th>d</th><th>Per group, 80% power</th><th>Per group, 90% power</th><th>Pairs, 80% power</th></tr></thead><tbody>{[0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0].map(d => <tr key={d}><td>{d}</td><td>{nPerGroup(d, 0.8, p.alpha)}</td><td>{nPerGroup(d, 0.9, p.alpha)}</td><td>{nPaired(d, 0.8, p.alpha)}</td></tr>)}</tbody></table></div></div></>}

    {tab === "random" && <div className="card"><h2>Randomisation list</h2>
      <p className="muted">Permuted blocks inside each stratum keep the groups balanced as you recruit. The seed makes the list reproducible; record it in the protocol. Keep the list with someone who is not scoring responses.</p>
      <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr" }}><div><label>Arms (comma separated)</label><input type="text" value={p.arms} onChange={e => set("arms", e.target.value)} /><label>Strata (comma separated, optional)</label><input type="text" value={p.strata} onChange={e => set("strata", e.target.value)} /></div>
        <div><label>Participants</label><input type="number" value={nTotal} min={2} max={500} onChange={e => setNTotal(Number(e.target.value))} /><label>Block size</label><input type="number" value={p.block} min={2} max={20} onChange={e => set("block", Number(e.target.value))} /><label>Seed</label><input type="number" value={p.seed} onChange={e => set("seed", Number(e.target.value))} /></div></div>
      {alloc instanceof Error ? <div className="callout" style={{ marginTop: 14 }}>{alloc.message}</div> : <>
        <div className="row"><button className="btn" onClick={() => dl("onconnect-randomisation.csv", "id,stratum,arm,block\n" + alloc.map(a => `${a.id},${a.stratum},${a.arm},${a.block}`).join("\n"), "text/csv")}>Download CSV</button></div>
        <div className="wrap" style={{ maxHeight: 280, overflow: "auto", marginTop: 12 }}><table><thead><tr><th>ID</th><th>Stratum</th><th>Arm</th><th>Block</th></tr></thead><tbody>{alloc.slice(0, 60).map(a => <tr key={a.id}><td>{a.id}</td><td>{a.stratum}</td><td>{a.arm}</td><td>{a.block}</td></tr>)}</tbody></table></div>
        <p className="muted">Counts: {p.arms.split(",").map(x => x.trim()).filter(Boolean).map(a => `${a} ${alloc.filter(r => r.arm === a).length}`).join(" · ")}</p></>}
      <h3 style={{ marginTop: 22 }}>Order counterbalancing (within-subjects)</h3><p className="muted">Each row is a participant group; numbers are the order in which they see the conditions. A Williams square also balances which condition follows which.</p>
      <div className="wrap"><table><tbody>{latinSquare(Math.max(2, p.arms.split(",").length)).map((r, i) => <tr key={i}><td>Group {i + 1}</td>{r.map((c, j) => <td key={j}>{p.arms.split(",")[c]?.trim()}</td>)}</tr>)}</tbody></table></div></div>}

    {tab === "ethics" && <div className="card"><h2>Before you collect any data</h2><div className="progress"><i style={{ width: `${(ethicsDone / ETHICS.length) * 100}%` }} /></div>
      {ETHICS.map(e => <div key={e.id} className="step"><input type="checkbox" checked={!!done[e.id]} onChange={() => setDone({ ...done, [e.id]: !done[e.id] })} aria-label={e.text} style={{ marginTop: 6 }} /><div><div style={{ fontWeight: 600 }}>{e.text}</div><div className="muted">{e.why}</div></div></div>)}
      <p className="muted" style={{ marginTop: 14 }}>This list is a prompt, not legal or ethical advice. Your review board and your fair&apos;s rules decide what is required.</p></div>}

    {tab === "forms" && <div className="card"><h2>Consent and assent templates</h2><p className="muted">Starting points to adapt and submit to your review board. They are not approved forms.</p>
      <div className="row"><button className="btn alt" onClick={() => dl("parent-permission.md", CONSENT.parent(p.title, "[name, email, phone]"))}>Parent permission (.md)</button>
        <button className="btn alt" onClick={() => dl("child-assent.md", CONSENT.assent(age))}>Child assent (.md)</button><select style={{ width: "auto" }} value={age} onChange={e => setAge(e.target.value)} aria-label="Assent age band">{["3-5", "6-8", "9-12", "13-15", "16-18"].map(a => <option key={a}>{a}</option>)}</select></div>
      <pre className="algo" style={{ marginTop: 14 }}>{CONSENT.assent(age)}</pre></div>}
  </>);
}
