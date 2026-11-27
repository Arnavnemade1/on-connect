import Link from "next/link";
import { gate, loadResearch, logAccess } from "@/lib/admin";
import { CARE_STAGES } from "@/lib/engine";
import { Empty } from "../ui";

export const dynamic = "force-dynamic";

/** Participant and cohort list (spec 15.3 item 2). Pseudonyms only: no names or contact details are stored for research. */
export default async function Participants() {
  const g = await gate(); if (!g.ok) return null; await logAccess(g.ctx, "view_participants");
  const d = await loadResearch(g.ctx);
  const rows = d.ps.map(p => { const mine = <T extends { user_id: string }>(xs: T[]) => xs.filter(x => x.user_id === p.user_id);
    const m = mine(d.msgs); return { p, sessions: mine(d.conversations).length, msgs: m.filter(x => x.role === "assistant").length, events: mine(d.events).length, checks: mine(d.checks).length, last: m.at(-1)?.created_at ?? p.updated_at }; });
  return (<><div className="admhead"><div><div className="eyebrow">Participants</div><h1>Consented participants</h1><p className="muted">{d.ps.length} of {d.all.length} accounts with a profile have research consent.</p></div></div>
    {!rows.length ? <Empty><p>No consented participants yet.</p></Empty> :
      <div className="wrap"><table><thead><tr><th>Participant</th><th>Type</th><th>Age</th><th>Care stage</th><th>Sessions</th><th>AI messages</th><th>Adaptation events</th><th>Checks</th><th>Consented</th><th>Last active</th></tr></thead><tbody>
        {rows.map(({ p, sessions, msgs, events, checks, last }) => <tr key={p.pseudonym}><td><Link href={`/admin/participants/${p.pseudonym}`}><code>{p.pseudonym}</code></Link></td><td>{p.user_type}</td><td>{p.age_band ?? "–"}</td><td>{CARE_STAGES.find(s => s[0] === p.care_stage)?.[1] ?? "–"}</td><td>{sessions}</td><td>{msgs}</td><td>{events}</td><td>{checks}</td><td>{p.consent_at ? new Date(p.consent_at).toLocaleDateString() : "–"}</td><td>{new Date(last).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</>);
}
