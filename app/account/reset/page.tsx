"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
/** Choose a new password after following the reset link (spec 21.1). The callback route has already signed the user in. */
export default function Reset() {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [done, setDone] = useState(false); const [err, setErr] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => { e.preventDefault(); const sb = supabase(); if (!sb) return; const { error } = await sb.auth.updateUser({ password: pw }); if (error) setErr(error.message); else setDone(true); };
  return (<><div className="eyebrow">Account</div><h1>Choose a new password</h1>
    {done ? <div className="card"><p>Your password is updated.</p><Link className="btn" href="/account">Back to account</Link></div> :
      <form className="card" onSubmit={save}><label htmlFor="p1">New password (at least 8 characters)</label><input id="p1" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} />
        <label htmlFor="p2">Type it again</label><input id="p2" type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} />
        <div className="row"><button className="btn" disabled={pw.length < 8 || pw !== pw2}>Save password</button></div>{err && <div className="banner" role="alert">{err}</div>}</form>}</>);
}
