import { gate, logAccess } from "@/lib/admin";

export const dynamic = "force-dynamic";
/** Research audit history (spec 21.3 item 5): who viewed or exported what, and when. */
export default async function Audit() {
  const g = await gate(); if (!g.ok) return null; await logAccess(g.ctx, "view_audit");
  const { data } = await g.ctx.sb.from("admin_access_log").select("*").order("ts", { ascending: false }).limit(300); const rows = (data ?? []) as { id: number; admin_id: string; action: string; target: string | null; details: unknown; ts: string }[];
  return (<><div className="admhead"><div><div className="eyebrow">Accountability</div><h1>Audit log</h1><p className="muted">Every Research Admin page view and export. Entries cannot be edited or deleted from the app.</p></div></div>
    <div className="wrap"><table><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{new Date(r.ts).toLocaleString()}</td><td><code>{r.admin_id.slice(0, 8)}</code>{r.admin_id === g.ctx.userId ? " (you)" : ""}</td><td>{r.action.replaceAll("_", " ")}</td><td>{r.target ?? "–"}</td><td className="muted">{r.details ? JSON.stringify(r.details) : ""}</td></tr>)}</tbody></table></div></>);
}
