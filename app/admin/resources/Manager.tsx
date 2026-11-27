"use client";
// Add, edit, verify, deactivate, search, filter and export organizations (spec 22.7 B). Writes go through Supabase with the
// researcher's own session, so the database policies decide what is allowed.
import { useMemo, useState } from "react";
import { Check, Download, Pencil, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { NEED_LABEL, type Need, type Org } from "@/lib/resources";

const EMPTY: Omit<Org, "id"> = { name: "", description: "", services: [], categories: [], population: "", eligibility: "", coverage: "", languages: ["English"], cost: "", application: "", referral: "", contact: "", website: "", apply_url: null, evidence: "", last_verified: null, verified_by: null, status: "needs_review" };
const STATUS: Org["status"][] = ["active", "needs_review", "inactive", "archived"];
const list = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

export default function Manager({ initial, verifier }: { initial: Org[]; verifier: string }) {
  const [orgs, setOrgs] = useState(initial); const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [st, setSt] = useState(""); const [geo, setGeo] = useState("");
  const [edit, setEdit] = useState<(Omit<Org, "id"> & { id?: string }) | null>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const shown = useMemo(() => orgs.filter(o => (!q || `${o.name} ${o.services.join(" ")} ${o.description}`.toLowerCase().includes(q.toLowerCase())) && (!cat || o.categories.includes(cat as Need)) && (!st || o.status === st) && (!geo || o.coverage.toLowerCase().includes(geo.toLowerCase()))), [orgs, q, cat, st, geo]);
  const stale = (o: Org) => !o.last_verified || Date.now() - Date.parse(o.last_verified) > 180 * 864e5;
  const save = async () => { if (!edit) return; const sb = supabase(); if (!sb) return; setBusy(true); setErr(null);
    const row = { ...edit, updated_at: new Date().toISOString() }; const { data, error } = edit.id ? await sb.from("community_orgs").update(row).eq("id", edit.id).select().single() : await sb.from("community_orgs").insert(row).select().single();
    setBusy(false); if (error) return setErr(error.message); setOrgs(o => (edit.id ? o.map(x => (x.id === edit.id ? (data as Org) : x)) : [...o, data as Org])); setEdit(null); };
  const verify = async (o: Org) => { const sb = supabase(); if (!sb) return; const patch = { status: "active" as const, last_verified: new Date().toISOString().slice(0, 10), verified_by: verifier, updated_at: new Date().toISOString() };
    const { error } = await sb.from("community_orgs").update(patch).eq("id", o.id); if (error) setErr(error.message); else setOrgs(x => x.map(y => (y.id === o.id ? { ...y, ...patch } : y))); };
  const setStatus = async (o: Org, status: Org["status"]) => { const sb = supabase(); if (!sb) return; const { error } = await sb.from("community_orgs").update({ status, updated_at: new Date().toISOString() }).eq("id", o.id); if (error) setErr(error.message); else setOrgs(x => x.map(y => (y.id === o.id ? { ...y, status } : y))); };
  const exportDir = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(orgs.filter(o => o.status === "active"), null, 2)], { type: "application/json" })); a.download = "onconnect-resource-directory.json"; a.click(); fetch("/api/admin/log?action=export_directory").catch(() => {}); };
  const F = ({ k, l, area }: { k: keyof Omit<Org, "id">; l: string; area?: boolean }) => <label>{l}{area ? <textarea value={String(edit![k] ?? "")} onChange={e => setEdit({ ...edit!, [k]: e.target.value })} /> : <input type="text" value={Array.isArray(edit![k]) ? (edit![k] as string[]).join(", ") : String(edit![k] ?? "")} onChange={e => setEdit({ ...edit!, [k]: Array.isArray(edit![k]) ? list(e.target.value) : e.target.value })} />}</label>;
  return (<>
    <div className="admfilter"><label>Search<input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Name or service" /></label>
      <label>Category<select value={cat} onChange={e => setCat(e.target.value)}><option value="">All</option>{Object.entries(NEED_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label>Status<select value={st} onChange={e => setSt(e.target.value)}><option value="">All</option>{STATUS.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Area<input type="text" value={geo} onChange={e => setGeo(e.target.value)} placeholder="e.g. Texas" /></label>
      <span className="grow" /><button className="btn alt sm" onClick={exportDir}><Download size={14} />Export verified</button><button className="btn sm" onClick={() => setEdit({ ...EMPTY })}><Plus size={14} />Add organization</button></div>
    {err && <div className="banner" role="alert">{err}</div>}
    {edit && <div className="orgedit"><h3>{edit.id ? "Edit organization" : "New organization"}</h3><p className="muted">New and edited organizations stay “needs review” until someone verifies the services and eligibility on the official site.</p>
      <div className="grid3"><F k="name" l="Official name" /><F k="website" l="Official website" /><F k="apply_url" l="Application link" /><F k="services" l="Services (comma separated)" /><F k="population" l="Who it serves" /><F k="eligibility" l="Eligibility" /><F k="coverage" l="Geographic coverage" /><F k="languages" l="Languages" /><F k="cost" l="Cost" /><F k="application" l="How to apply" /><F k="referral" l="Referral needed?" /><F k="contact" l="Official contact" /><F k="evidence" l="Where this was verified" /></div>
      <F k="description" l="Description" area />
      <label>Categories</label><div className="chips">{(Object.keys(NEED_LABEL) as Need[]).map(n => <button type="button" key={n} className={"chip" + (edit.categories.includes(n) ? " on" : "")} onClick={() => setEdit({ ...edit, categories: edit.categories.includes(n) ? edit.categories.filter(x => x !== n) : [...edit.categories, n] })}>{NEED_LABEL[n]}</button>)}</div>
      <div className="row"><button className="btn" disabled={busy || !edit.name.trim() || !/^https:\/\//.test(edit.website)} onClick={save}>{busy ? "Saving" : "Save"}</button><button className="btn alt" onClick={() => setEdit(null)}>Cancel</button></div></div>}
    <div className="wrap"><table><thead><tr><th>Organization</th><th>Categories</th><th>Coverage</th><th>Status</th><th>Last verified</th><th>Link</th><th></th></tr></thead><tbody>
      {shown.map(o => <tr key={o.id}><td><a href={o.website} target="_blank" rel="noreferrer">{o.name}</a><div className="muted">{o.services.join(", ")}</div></td><td className="muted">{o.categories.map(c => NEED_LABEL[c] ?? c).join(", ")}</td><td className="muted">{o.coverage}</td>
        <td><select value={o.status} onChange={e => setStatus(o, e.target.value as Org["status"])} aria-label={`Status of ${o.name}`}>{STATUS.map(s => <option key={s}>{s}</option>)}</select></td>
        <td>{o.last_verified ?? "never"}{o.verified_by ? <div className="muted">{o.verified_by}</div> : null}{stale(o) && o.status === "active" ? <div className="warnt">re-verify</div> : null}</td><td className="muted">{(o as Org & { link_status?: string }).link_status ?? "unchecked"}</td>
        <td className="nowrap">{o.status !== "active" && <button className="lnk" onClick={() => verify(o)}><Check size={13} />Mark verified</button>}<button className="lnk" onClick={() => setEdit({ ...o })}><Pencil size={13} />Edit</button></td></tr>)}</tbody></table></div>
    <p className="muted">“Mark verified” records today&apos;s date and your account as the verifier, and makes the organization recommendable. Only do it after checking the official site.</p></>);
}
