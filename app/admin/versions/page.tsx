import { gate, logAccess } from "@/lib/admin";
import { CHANGELOG, CONFIGS, VERSIONS, VERSION_LABEL, diffConfigs, type Versions } from "@/lib/versions";
import { REGISTRY } from "@/lib/params";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | undefined>>;

/** Version registry, architecture change log and configuration diff viewer (spec 13.1–13.5, 22.5). */
export default async function VersionsPage({ searchParams }: { searchParams: SP }) {
  const g = await gate(); if (!g.ok) return null; await logAccess(g.ctx, "view_versions"); const sp = await searchParams; const keys = Object.keys(CONFIGS);
  const a = keys.includes(sp.a ?? "") ? sp.a! : keys[0], b = keys.includes(sp.b ?? "") ? sp.b! : keys[keys.length - 1]; const diff = diffConfigs(CONFIGS[a], CONFIGS[b]);
  const show = (v: unknown) => (v === undefined ? "–" : typeof v === "string" ? v : JSON.stringify(v));
  return (<><div className="admhead"><div><div className="eyebrow">Architecture</div><h1>Versions and changes</h1><p className="muted">Every AI message records the versions that produced it. Global changes are versioned and tested before deployment; patient-level adaptation never edits them.</p></div></div>
    <section className="admsec two"><div><h2>Current versions</h2><table><tbody>{(Object.keys(VERSIONS) as (keyof Versions)[]).map(k => <tr key={k}><td className="muted">{VERSION_LABEL[k]}</td><td><code>{VERSIONS[k]}</code></td></tr>)}<tr><td className="muted">Model</td><td><code>{process.env.OPENROUTER_MODEL || "~openai/gpt-terra-latest"}</code> via OpenRouter</td></tr></tbody></table>
      <p className="muted">Exact reproduction is not guaranteed: the model provider does not promise deterministic output, and the “latest” alias can move to a newer snapshot. Pin <code>OPENROUTER_MODEL</code> to a dated model for a study.</p></div>
      <div><h2>Adaptation parameter registry</h2><table><thead><tr><th>Parameter</th><th>Levels</th><th>Component</th></tr></thead><tbody>{REGISTRY.map(p => <tr key={p.id}><td title={p.describe}>{p.label}</td><td className="muted">{p.values.join(" · ")}</td><td className="muted">{p.component.replace(" Engine", "")}</td></tr>)}</tbody></table>
        <p className="muted">Named engineering settings, not validated scales. Values are calibrated through research, not assumed.</p></div></section>
    <section className="admsec"><h2>Configuration diff</h2><form className="admfilter"><label>From<select name="a" defaultValue={a}>{keys.map(k => <option key={k}>{k}</option>)}</select></label><label>To<select name="b" defaultValue={b}>{keys.map(k => <option key={k}>{k}</option>)}</select></label><button className="btn sm">Compare</button></form>
      <p>{diff.filter(x => x.kind !== "same").length} of {diff.length} settings differ between <code>{a}</code> and <code>{b}</code>.</p>
      <div className="wrap"><table><thead><tr><th>Setting</th><th>Change</th><th>{a}</th><th>{b}</th></tr></thead><tbody>{diff.map(x => <tr key={x.key} className={x.kind === "same" ? "" : "chg"}><td>{x.key.replaceAll("_", " ")}</td><td>{x.kind}</td><td className="muted">{show(x.from)}</td><td>{show(x.to)}</td></tr>)}</tbody></table></div>
      <details><summary>Machine-readable diff</summary><pre className="algo">{JSON.stringify(diff.filter(x => x.kind !== "same"), null, 2)}</pre></details></section>
    <section className="admsec"><h2>Architecture change log</h2><div className="wrap"><table><thead><tr><th>Change</th><th>Date</th><th>Component</th><th>Version</th><th>Reason</th><th>Expected effect</th><th>Testing</th><th>Validation</th><th>Deployment</th><th>Rollback</th></tr></thead><tbody>
      {[...CHANGELOG].reverse().map(c => <tr key={c.id}><td><code>{c.id}</code></td><td>{c.date}</td><td>{c.component}</td><td className="muted">{c.prev} → {c.next}</td><td>{c.reason}</td><td className="muted">{c.expected}</td><td className="muted">{c.tests}</td><td>{c.validation}</td><td>{c.deployment}</td><td><code>{c.rollback}</code></td></tr>)}</tbody></table></div>
      <p className="muted">The expected effect is what the change was designed to do. Measured effects come only from the evaluation harness and approved studies.</p></section></>);
}
