import Link from "next/link";
import { gate } from "@/lib/admin";
import AdminNav from "./nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Onconnect Research Admin" };

/** The Research Admin backend (spec 21.3): a separate interface. Access is decided on the server for every request. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const g = await gate();
  return (<div className="adm">
    <header className="admbar"><Link href="/admin" className="logo"><span className="mark"><i /></span>Onconnect <span className="admtag">Research Admin</span></Link>{g.ok && <AdminNav />}<span className="grow" />
      {g.ok && <span className="muted admwho">{g.ctx.email} · {g.ctx.role}</span>}<Link href="/chat" className="pbtn dark sm">Patient app</Link></header>
    <main className="admmain">{g.ok ? children : <div className="admgate">
      <h1>{g.reason === "signed_out" ? "Sign in to continue" : g.reason === "not_configured" ? "The backend is not connected" : "You do not have research access"}</h1>
      {g.reason === "signed_out" && <p>The Research Admin dashboard is only for authorized researchers. <Link href="/account?next=/admin">Sign in</Link> with a researcher account.</p>}
      {g.reason === "not_configured" && <p>This deployment has no Supabase project, so there is no research data to show.</p>}
      {g.reason === "forbidden" && <><p>You are signed in as {g.email}, which is not a Research Admin. The role can only be granted by a system administrator, never by the account itself.</p>
        <p className="muted">Administrators grant it in the Supabase SQL editor: <code>update auth.users set raw_app_meta_data = raw_app_meta_data || &apos;{`{"role":"researcher"}`}&apos; where email = &apos;…&apos;;</code> then the researcher signs out and back in.</p></>}
    </div>}</main>
    <footer className="admfoot">Pseudonymized research data. Only participants who gave research consent are shown, and every view and export is logged.</footer>
  </div>);
}
