import Link from "next/link";
import { gate, loadResearch, logAccess } from "@/lib/admin";
import { adaptationBreakdown, linguistic, medicalContext, overview, psychological, tally } from "@/lib/adminMetrics";
import { PARAM, type ParamId } from "@/lib/params";
import { LEVELS } from "@/lib/content";
import { CARE_STAGES } from "@/lib/engine";
import { Bars, Empty, MetricCard } from "./ui";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | undefined>>;

/** Research Center overview with the analytics dashboards (spec 11.1–11.8). Filters apply to every number on the page. */
export default async function AdminHome({ searchParams }: { searchParams: SP }) {
  const g = await gate(); if (!g.ok) return null; const sp = await searchParams;
  const f = { from: sp.from || undefined, to: sp.to || undefined, age: sp.age || undefined, stage: sp.stage || undefined };
  await logAccess(g.ctx, "view_overview", undefined, f);
  const d = await loadResearch(g.ctx, f); const metrics = overview({ participants: d.ps.length, eligible: d.all.length, conversations: d.conversations.length, msgs: d.msgs, events: d.events, records: d.records, checks: d.checks });
  const ad = adaptationBreakdown(d.events); const ling = linguistic(d.msgs); const psy = psychological(d.msgs); const stageOf = (u: string) => d.ps.find(p => p.user_id === u)?.care_stage ?? null;
  const med = medicalContext(d.msgs, stageOf); const versions = tally(d.msgs.filter(m => m.report?.versions).map(m => `${m.report!.versions.system} · ${m.report!.model}`));
  const period = f.from || f.to ? `${f.from ?? "start"} to ${f.to ?? "now"}` : "all time";
  return (<>
    <div className="admhead"><div><div className="eyebrow">Research Center</div><h1>Overview</h1><p className="muted">Consented participants only · {period}{f.age ? ` · ages ${f.age}` : ""}{f.stage ? ` · ${CARE_STAGES.find(s => s[0] === f.stage)?.[1]}` : ""}</p></div>
      <form className="admfilter"><label>From<input type="date" name="from" defaultValue={f.from} /></label><label>To<input type="date" name="to" defaultValue={f.to} /></label>
        <label>Age<select name="age" defaultValue={f.age ?? ""}><option value="">All</option>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></label>
        <label>Care stage<select name="stage" defaultValue={f.stage ?? ""}><option value="">All</option>{CARE_STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><button className="btn sm">Apply</button></form></div>
    {!d.ps.length ? <Empty><h2>No consented participants yet</h2><p>Data appears here once a signed-in participant turns on research sharing on their Account page. Product use alone never enrolls anyone (spec 17.4).</p></Empty> : <>
      <section className="admsec"><div className="mgrid">{metrics.map(m => <MetricCard key={m.key} m={m} />)}</div></section>
      <section className="admsec two"><div><h2>Adaptation analytics</h2><p className="muted">Spec 11.2. Most frequently modified parameters.</p><Bars rows={ad.byParam.map(([k, v]) => [PARAM[k as ParamId]?.label ?? k, v])} />
        <h3>By trigger</h3><Bars rows={ad.byTrigger} /><h3>By component</h3><Bars rows={ad.byComponent} /><h3>Reversed, by parameter</h3><Bars rows={ad.reversedByParam.map(([k, v]) => [PARAM[k as ParamId]?.label ?? k, v])} /></div>
        <div><h2>Linguistic analytics</h2><p className="muted">Spec 11.3. Reading complexity is the Flesch–Kincaid grade of the answer, not a measure of the reader.</p>
          <div className="wrap"><table><thead><tr><th>Profile used</th><th>n</th><th>Words</th><th>Grade</th><th>Target</th><th>Words / sentence</th><th>Glossary terms</th></tr></thead><tbody>{ling.map(r => <tr key={r.level}><td>{r.level}</td><td>{r.n}</td><td>{fmt(r.words)}</td><td>{fmt(r.grade)}</td><td>{r.target ?? "–"}</td><td>{fmt(r.perSentence)}</td><td>{fmt(r.terms)}</td></tr>)}</tbody></table></div>
          <h2 style={{ marginTop: 32 }}>Psychological communication</h2><p className="muted">Spec 11.4. AI behaviour, not psychological outcomes.</p>
          <table><tbody><tr><td>Feelings stated</td><td>{psy.stated}</td></tr><tr><td>Acknowledged (heuristic)</td><td>{psy.acknowledged} of {psy.stated}</td></tr><tr><td>Human support suggested</td><td>{psy.humanSupport}</td></tr><tr><td>Asked not to discuss feelings</td><td>{psy.declined}</td></tr><tr><td>Crisis escalations</td><td>{psy.escalations}</td></tr><tr><td>False-reassurance flags</td><td>{psy.falseReassurance}</td></tr></tbody></table>
          <Bars rows={psy.byType} /></div></section>
      <section className="admsec two"><div><h2>Medical context</h2><p className="muted">Spec 11.7. Care stage is user-provided.</p><div className="wrap"><table><thead><tr><th>Stage</th><th>Messages</th><th>Adaptation events</th><th>Top topics</th></tr></thead><tbody>{med.map(r => <tr key={r.stage}><td>{CARE_STAGES.find(s => s[0] === r.stage)?.[1] ?? r.stage}</td><td>{r.n}</td><td>{r.events}</td><td>{r.topics.map(t => t[0]).join(", ")}</td></tr>)}</tbody></table></div></div>
        <div><h2>Model and versions in use</h2><p className="muted">Spec 11.8. <Link href="/admin/versions">Compare versions</Link></p><Bars rows={versions} /></div></section>
      <section className="admsec"><h2>Participants</h2><p className="muted"><Link href="/admin/participants">Open the participant list</Link> for longitudinal reports and adaptation timelines.</p></section></>}
  </>);
}
const fmt = (x: number | null) => (x == null ? "–" : String(Math.round(x * 10) / 10));
