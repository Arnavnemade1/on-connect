import { gate, logAccess } from "@/lib/admin";
import { NEED_LABEL, type Need, type Org } from "@/lib/resources";
import { tally } from "@/lib/adminMetrics";
import { Bars } from "../ui";
import Manager from "./Manager";

export const dynamic = "force-dynamic";
/** Community Organizations & Support Resources (spec 22.7). Only verified, active organizations can be recommended in chat. */
export default async function Resources() {
  const g = await gate(); if (!g.ok) return null; await logAccess(g.ctx, "view_resources");
  const [{ data: orgs }, { data: matches }] = await Promise.all([g.ctx.sb.from("community_orgs").select("*").order("name"), g.ctx.sb.from("resource_matches").select("org_id,category,ts").limit(5000)]);
  const O = (orgs ?? []) as Org[]; const M = (matches ?? []) as { org_id: string | null; category: string; ts: string }[];
  const covered = new Set(O.filter(o => o.status === "active").flatMap(o => o.categories)); const gaps = (Object.keys(NEED_LABEL) as Need[]).filter(n => !covered.has(n));
  return (<><div className="admhead"><div><div className="eyebrow">Community support</div><h1>Organizations and support resources</h1><p className="muted">{O.length} organizations · {O.filter(o => o.status === "active").length} verified and recommendable · {O.filter(o => o.status === "needs_review").length} need review</p></div></div>
    <section className="admsec two"><div><h2>Requested support</h2><p className="muted">Needs detected in chat that led to a verified recommendation. A recommendation is not proof that anyone received help.</p><Bars rows={tally(M.map(m => NEED_LABEL[m.category as Need] ?? m.category))} />
      <h2 style={{ marginTop: 24 }}>Most recommended</h2><Bars rows={tally(M.map(m => O.find(o => o.id === m.org_id)?.name ?? "unknown"))} /></div>
      <div><h2>Coverage gaps</h2><p className="muted">Support categories with no verified organization yet. The chat recommends nothing in these areas and points to a hospital social worker instead.</p>
        {gaps.length ? <ul className="plain">{gaps.map(n => <li key={n}>{NEED_LABEL[n]}</li>)}</ul> : <p>Every category has at least one verified organization.</p>}
        <h2 style={{ marginTop: 24 }}>By category</h2><Bars rows={tally(O.filter(o => o.status === "active").flatMap(o => o.categories.map(c => NEED_LABEL[c] ?? c)))} /></div></section>
    <section className="admsec"><Manager initial={O} verifier={g.ctx.email} /></section></>);
}
