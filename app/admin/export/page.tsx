import { gate, logAccess } from "@/lib/admin";
export const dynamic = "force-dynamic";
const SETS: [string, string][] = [["participants", "Participants (pseudonym, type, age band, stage, consent date)"], ["messages", "Messages with their measurements"], ["adaptation_events", "Adaptation events"], ["memory_records", "Memory records (deleted content removed)"], ["comprehension_checks", "Comprehension checks"]];
/** Data export center (spec 15.3 item 16). */
export default async function Export() {
  const g = await gate(); if (!g.ok) return null; await logAccess(g.ctx, "view_export");
  return (<><div className="admhead"><div><div className="eyebrow">Data</div><h1>Export center</h1><p className="muted">Pseudonymized: account ids are replaced by participant codes. Only consented participants are included, and every export is written to the audit log.</p></div></div>
    <div className="wrap"><table><thead><tr><th>Dataset</th><th>JSON</th><th>CSV</th></tr></thead><tbody>
      <tr><td><b>Everything</b></td><td><a href="/api/admin/export?kind=all&format=json">Download</a></td><td className="muted">Use per-dataset CSV</td></tr>
      {SETS.map(([k, l]) => <tr key={k}><td>{l}</td><td><a href={`/api/admin/export?kind=${k}&format=json`}>Download</a></td><td><a href={`/api/admin/export?kind=${k}&format=csv`}>Download</a></td></tr>)}</tbody></table></div>
    <p className="muted">Exports include message text only because each participant gave research consent. Handle them under your approved protocol, and never re-identify participants.</p></>);
}
