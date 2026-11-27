"use client";
// The communication guideline matrix (spec 22.3): profile × situation, with evidence strength, words to avoid and references.
import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVELS, PROFILES, type Level } from "@/lib/content";
import { GUIDELINES, GUIDELINE_BY_ID, GUIDELINE_VERSION, GREFS, GREF_BY_KEY, SITUATIONS, strength, type Guideline } from "@/lib/guidelines";

const TONE: Record<string, string> = { "Systematic review": "s3", Study: "s2", Guideline: "s1", "Expert opinion": "s0", "No specific evidence (fallback)": "sx" };

export default function Guidelines() {
  const [sel, setSel] = useState<string>("G-3-5-mri");
  useEffect(() => { const h = decodeURIComponent(location.hash.slice(1)); if (GUIDELINE_BY_ID[h]) setSel(h); }, []);
  const g = GUIDELINE_BY_ID[sel]; const cross = GUIDELINES.filter(x => x.crossCutting);
  const cell = (l: Level, t: string) => GUIDELINES.find(x => x.age === l && x.topic === t)!;
  const pick = (x: Guideline) => { setSel(x.id); history.replaceState(null, "", `#${x.id}`); document.getElementById("gdetail")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
  const verified = GREFS.filter(r => r.verified === "crossref").length;
  return (<>
    <div className="eyebrow">Research · Evidence</div><h1>Guideline matrix</h1>
    <p>How to explain each situation to each age, compiled from published pediatric oncology guidance. The row for the reader&apos;s profile and topic goes into every adaptive answer, and every answer is checked for the words its row says to avoid.</p>
    <div className="callout good"><b>{GUIDELINES.length} rows, {GUIDELINE_VERSION}.</b> {verified} journal references confirmed in Crossref; {GREFS.length - verified} institutional documents to check by hand. Existence was checked automatically; whether each page says exactly what its row says still needs a human read.</div>

    <div className="gm-legend">{Object.entries(TONE).map(([k, v]) => <span key={k}><i className={v} />{k}</span>)}</div>
    <div className="wrap"><table className="gm"><thead><tr><th>Profile</th>{SITUATIONS.map(s => <th key={s.id}>{s.label}</th>)}</tr></thead>
      <tbody>{LEVELS.map(l => <tr key={l}><th scope="row">Ages {l.replace("-", "–")}<span>{PROFILES[l]}</span></th>{SITUATIONS.map(s => { const x = cell(l, s.id); return <td key={s.id}><button className={`gcell ${TONE[strength(x)]}${sel === x.id ? " on" : ""}`} onClick={() => pick(x)} aria-label={`${s.label}, ages ${l}: ${strength(x)}`}><i />{x.avoid.length > 0 && <small>{x.avoid.length} to avoid</small>}</button></td>; })}</tr>)}
        <tr><th scope="row">All ages<span>Cross-cutting</span></th><td colSpan={SITUATIONS.length}><div className="gcross">{cross.map(x => <button key={x.id} className={`chipb${sel === x.id ? " on" : ""}`} onClick={() => pick(x)}>{x.situation}</button>)}</div></td></tr></tbody></table></div>

    {g && <article id="gdetail" className="gdetail">
      <header><code>{g.id}</code><h2>{g.situation}{!g.crossCutting && <span className="muted"> · ages {g.age.replace("-", "–")}</span>}</h2><span className={`gtag ${TONE[strength(g)]}`}>{strength(g)}</span></header>
      <div className="gcols"><section><h3>Do this</h3><p>{g.rule}</p></section>
        <section><h3>Don&apos;t</h3><p>{g.dont}</p>{g.avoid.length > 0 && <><h4>Words the answer is checked for</h4><div className="gavoid">{g.avoid.map(a => <span key={a.pattern}>{a.phrase}</span>)}</div></>}</section></div>
      <blockquote className="gex">{g.example}</blockquote>
      <h3>Sources</h3><p className="muted">As written in the spreadsheet: {g.source}</p>
      <ul className="plain">{g.refs.map(k => { const r = GREF_BY_KEY[k]; return <li key={k}>{r.cite} {r.doi ? <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">doi:{r.doi}</a> : null} <span className={"vchip " + (r.verified === "crossref" ? "crossref" : "not_machine_verifiable")}>{r.verified === "crossref" ? "DOI checked" : "Check by hand"}</span></li>; })}</ul>
      {g.noSpecificEvidence && <p className="muted">No study addresses this exact age and procedure, so the row falls back on general preparation guidance for the age. That gap is reported, not filled in.</p>}
    </article>}
    <p className="muted"><Link href="/literature">Evidence behind each adaptation rule</Link> · <Link href="/method">Method</Link></p>
  </>);
}
