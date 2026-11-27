import { REFS, REF_BY_ID, RULES, VERIFIED_LABEL, type Status } from "@/lib/literature";
const LABEL: Record<Status, string> = { measured: "Measured here", inspired: "Design inspiration", untested: "Not tested yet" };

/** Evidence behind each adaptation mechanism (spec 22.3): concept, sources, strength, activation conditions, risks and measurement. */
export default function Literature() {
  const n = (id: string) => REFS.findIndex(r => r.id === id) + 1;
  const counts = REFS.reduce<Record<string, number>>((m, r) => ((m[r.verified] = (m[r.verified] ?? 0) + 1), m), {});
  return (<>
    <div className="eyebrow">Research · Evidence</div><h1>Where each adaptation rule comes from</h1>
    <p>Every adaptation mechanism has a research record: the idea behind it, the published evidence, how strong that evidence is, when the rule should and should not fire, what could go wrong, and how it is measured. A rule backed by theory is not the same as a rule shown to work here, and the status column says which is which.</p>
    <div className="callout good"><b>References checked {RULES[0].reviewed}.</b> {counts.crossref ?? 0} by DOI in Crossref, {counts.pubmed ?? 0} in PubMed, {counts.openlibrary ?? 0} in a library catalog. {counts.not_machine_verifiable ?? 0} could not be checked automatically and are marked; verify those by hand before citing.</div>
    <ol className="rules">{RULES.map(r => <li key={r.id}>
      <div className="rhd"><code>{r.id}</code><h2>{r.mechanism}</h2><span className="tag">{LABEL[r.status]}</span></div>
      <p>{r.concept} <span className="muted">{r.refs.map(x => `[${n(x)}]`).join(" ")}</span></p>
      <dl className="rdl"><div><dt>Evidence strength</dt><dd>{r.strength}</dd></div><div><dt>Need it serves</dt><dd>{r.need}</dd></div><div><dt>What the system does</dt><dd>{r.behavior}</dd></div>
        <div><dt>Activates when</dt><dd>{r.activate}</dd></div><div><dt>Does not activate when</dt><dd>{r.notWhen}</dd></div><div><dt>Expected benefit</dt><dd>{r.benefit}</dd></div>
        <div><dt>Limits and risks</dt><dd>{r.risks}</dd></div><div><dt>How it is measured</dt><dd>{r.measure}</dd></div><div><dt>Parameters</dt><dd>{r.params.length ? r.params.join(", ").replaceAll("_", " ") : "none"}</dd></div>
        <div><dt>Guideline version</dt><dd>{r.version} · reviewed {r.reviewed}</dd></div></dl></li>)}</ol>
    <div className="card" style={{ marginTop: 48 }}><h2>References</h2><ol className="refs">{REFS.map(r => <li key={r.id}>{r.cite} {r.url && <a href={r.url} target="_blank" rel="noreferrer">{r.doi ? `doi:${r.doi}` : "link"}</a>} <span className={"vchip " + r.verified}>{VERIFIED_LABEL[r.verified]}</span></li>)}</ol></div>
    <p className="muted">Changes to these shared rules are versioned and reviewed before deployment; a patient&apos;s own adaptation never edits them. {Object.keys(REF_BY_ID).length} references.</p>
  </>);
}
