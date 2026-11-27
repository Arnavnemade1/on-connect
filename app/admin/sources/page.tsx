import { gate, loadResearch, logAccess } from "@/lib/admin";
import { citationAudit } from "@/lib/adminMetrics";
import { SOURCES, SOURCE_BY_ID, TYPE_LABEL, RETRIEVAL_VERSION, KB_VERSION } from "@/lib/sources";
import { Bars } from "../ui";
import checked from "@/data/source-check.json";

export const dynamic = "force-dynamic";

/** Source and evidence dashboard (spec 21.8, 22.4): the registry, link checks, and citation auditing across consented conversations. */
export default async function Sources() {
  const g = await gate(); if (!g.ok) return null; await logAccess(g.ctx, "view_sources");
  const d = await loadResearch(g.ctx); const a = citationAudit(d.msgs); const chk = checked as { checked: string; results: { id: string; status: number; title: string; finalUrl: string }[] };
  const status = new Map(chk.results.map(r => [r.id, r])); const pctOf = (k: number, n: number) => (n ? `${Math.round((k / n) * 100)}%` : "n/a");
  return (<><div className="admhead"><div><div className="eyebrow">Evidence</div><h1>Sources and citations</h1><p className="muted">{SOURCES.length} verified sources · {RETRIEVAL_VERSION} · {KB_VERSION} · links last checked {chk.checked}</p></div></div>
    <section className="admsec"><div className="mgrid">
      <div className="mcard"><div className="mlabel">Factual sentences cited</div><div className="mval">{pctOf(a.citedFactual, a.factual)}</div><div className="mden">n = {a.citedFactual} of {a.factual} in {a.perClaim} model answers</div></div>
      <div className="mcard"><div className="mlabel">Citations that match their source</div><div className="mval">{pctOf(a.supported, a.supported + a.weak + a.invalid)}</div><div className="mden">{a.supported} supported · {a.weak} weak · {a.invalid} invalid</div></div>
      <div className="mcard"><div className="mlabel">Links that resolve</div><div className="mval">{pctOf(chk.results.filter(r => r.status === 200).length, chk.results.length)}</div><div className="mden">{chk.results.length} checked on {chk.checked}</div></div>
      <div className="mcard"><div className="mlabel">Answers with topic-level sources only</div><div className="mval">{a.answers - a.perClaim}</div><div className="mden">Template answers; not matched sentence by sentence</div></div></div>
      <p className="muted">Support is judged by lexical overlap between the cited sentence and the stored passages from the source page: at least 3 shared content words or 30% of the sentence. It is a screening heuristic, not proof that the source supports the claim. Weak matches should be reviewed by hand.</p></section>
    <section className="admsec two"><div><h2>Most cited</h2><Bars rows={a.mostCited.map(([id, n]) => [SOURCE_BY_ID[id]?.title ?? id, n])} />
      <h2 style={{ marginTop: 32 }}>Factual sentences without a citation</h2>{a.uncited.length ? <ul className="plain">{a.uncited.map((u, i) => <li key={i} className="muted">“{u}”</li>)}</ul> : <p className="muted">None found.</p>}</div>
      <div><h2>Source types</h2><Bars rows={Object.entries(SOURCES.reduce<Record<string, number>>((m, s) => ((m[TYPE_LABEL[s.type]] = (m[TYPE_LABEL[s.type]] ?? 0) + 1), m), {}))} />
        <p className="muted">Hierarchy (spec 21.7): systematic reviews, peer-reviewed research, clinical guidance, government, pediatric hospitals. The medical-education registry currently holds government, professional-society and hospital sources; peer-reviewed research is used for the communication rules (see the literature map).</p></div></section>
    <section className="admsec"><h2>Registry</h2><div className="wrap"><table><thead><tr><th>Source</th><th>Organization</th><th>Type</th><th>Topics</th><th>Reviewed</th><th>Link check</th><th>Passages</th></tr></thead><tbody>
      {SOURCES.map(s => { const c = status.get(s.id); return <tr key={s.id}><td><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></td><td>{s.org}</td><td>{TYPE_LABEL[s.type]}</td><td>{s.topics.join(", ")}</td><td>{s.reviewed ?? "not stated"}</td><td className={c?.status === 200 ? "ok" : "bad"}>{c ? `${c.status}${c.title ? ` · “${c.title.slice(0, 40)}”` : ""}` : "not checked"}</td><td>{s.passages.length}</td></tr>; })}</tbody></table></div></section></>);
}
