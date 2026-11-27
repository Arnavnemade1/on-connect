"use client";
// Accounts (spec 21.1) and research participation (17.4, 21.4). Using Onconnect never enrolls anyone in research:
// consent is a separate, explicit step, stored server-side, and can be withdrawn.
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CloudOff, LogOut, RefreshCw } from "lucide-react";
import { useSync } from "@/components/SyncProvider";
import { supabase } from "@/lib/supabase/client";
import { SHARE_KEY } from "@/lib/research";

const ERRORS: Record<string, string> = { signin_failed: "That link did not work. It may have expired. Try again.", missing_code: "The link was incomplete. Try again.", not_configured: "Accounts are not set up on this deployment." };
const CONSENT_VERSION = "onconnect-consent-draft-1";
type Mode = "signin" | "signup" | "magic" | "forgot";

function Account() {
  const { configured, user, status, lastSync, error, syncNow, signOut, deleteCloud, ready } = useSync(); const q = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin"); const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(q.get("error") ? ERRORS[q.get("error")!] ?? "Sign-in failed." : null); const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<{ on: boolean; at: string | null; pseudonym: string | null } | null>(null); const [ack, setAck] = useState({ age: false, approved: false });
  const [confirmDel, setConfirmDel] = useState(false); const [delReq, setDelReq] = useState<string | null>(null);
  const sb = supabase(); const origin = typeof location !== "undefined" ? location.origin : "";

  useEffect(() => { if (!user || !sb) return; sb.from("profiles").select("research_consent,consent_at,pseudonym").eq("user_id", user.id).maybeSingle().then(({ data }) => setConsent(data ? { on: data.research_consent, at: data.consent_at, pseudonym: data.pseudonym } : { on: false, at: null, pseudonym: null })); }, [user, sb]);

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => { setBusy(true); setErr(null); setMsg(null); const { error: e } = await fn(); setBusy(false); if (e) setErr(e.message); else setMsg(ok); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!sb) return; const em = email.trim();
    if (mode === "signin") return run(() => sb.auth.signInWithPassword({ email: em, password: pw }), "Signed in.");
    if (mode === "signup") return run(() => sb.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: `${origin}/auth/callback` } }), "Check your inbox to confirm your email, then sign in.");
    if (mode === "magic") return run(() => sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: `${origin}/auth/callback` } }), "Check your inbox for a sign-in link.");
    return run(() => sb.auth.resetPasswordForEmail(em, { redirectTo: `${origin}/auth/callback?next=/account/reset` }), "If that email has an account, a reset link is on its way."); };
  const setResearch = async (on: boolean) => { if (!sb || !user) return; setBusy(true);
    const { error: e } = await sb.from("profiles").upsert({ user_id: user.id, research_consent: on, consent_at: on ? new Date().toISOString() : null, consent_version: on ? CONSENT_VERSION : null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setBusy(false); if (e) return setErr(e.message); try { localStorage.setItem(SHARE_KEY, on ? "1" : "0"); } catch {} setConsent(c => ({ on, at: on ? new Date().toISOString() : null, pseudonym: c?.pseudonym ?? null })); };
  const requestDeletion = async () => { if (!sb || !user) return; const { error: e } = await sb.from("deletion_requests").insert({ user_id: user.id, reason: "Requested from the account page" }); setDelReq(e ? `Could not send the request: ${e.message}` : "Request sent. An administrator will delete the account and confirm by email."); };
  const when = lastSync ? new Date(lastSync).toLocaleString() : "never";
  const pwOk = mode === "magic" || mode === "forgot" || pw.length >= 8;

  return (<><div className="eyebrow">You</div><h1>Account and research</h1>
    <p>Onconnect works without an account; everything stays in this browser. An account saves your conversations and learning history so they follow you to another device.</p>

    {!configured && <div className="card"><h2><CloudOff size={18} style={{ verticalAlign: "-3px", marginRight: 8 }} />Accounts are not connected</h2><p>This deployment has no Supabase project, so data stays on this device. See <code>supabase/README.md</code>.</p></div>}

    {configured && ready && !user && <div className="card"><div className="tabs" role="tablist">{([["signin", "Sign in"], ["signup", "Create account"], ["magic", "Email me a link"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => { setMode(k); setErr(null); setMsg(null); }}>{l}</button>)}</div>
      <form onSubmit={submit}>
        <label htmlFor="em">Email address</label><input id="em" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        {(mode === "signin" || mode === "signup") && <><label htmlFor="pw">Password {mode === "signup" && <span className="muted">(at least 8 characters)</span>}</label><input id="pw" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={pw} onChange={e => setPw(e.target.value)} /></>}
        <div className="row"><button className="btn" disabled={busy || !email.includes("@") || !pwOk}>{busy ? "Working" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : mode === "magic" ? "Send sign-in link" : "Send reset link"}</button>
          {mode === "signin" && <button type="button" className="btn alt" onClick={() => { setMode("forgot"); setMsg(null); setErr(null); }}>Forgot password</button>}</div>
        {mode === "forgot" && <p className="muted">Enter your email and we&apos;ll send a link to choose a new password.</p>}
        <p className="muted" style={{ marginTop: 16 }}>Children should use a parent or guardian&apos;s email. We use it only to sign you in.</p></form>
      {msg && <div className="banner ok" role="status"><Check size={15} /> {msg}</div>}{err && <div className="banner" role="alert">{err}</div>}</div>}

    {configured && user && <>
      <div className="card"><h2>Signed in</h2><p>{user.email}</p>
        <p className="muted">{status === "syncing" ? "Saving…" : status === "error" ? "Sync problem" : "Saved and up to date"} · last sync {when}</p>{(error || err) && <div className="banner" role="alert">{error ?? err}</div>}
        <div className="row"><button className="btn" onClick={syncNow} disabled={status === "syncing"}><RefreshCw size={15} />Sync now</button><Link className="btn alt" href="/history">Conversation history</Link><button className="btn alt" onClick={signOut}><LogOut size={15} />Sign out</button></div>
        <p className="muted" style={{ marginTop: 16 }}>New conversations, their adaptation reports and your memory are saved to your account as you chat. Theme and text size stay on each device.</p></div>

      <div className="card"><h2>Research participation</h2>
        {consent?.on ? <><p>You are taking part in research as participant <code>{consent.pseudonym}</code> since {consent.at ? new Date(consent.at).toLocaleDateString() : "–"}. Authorized researchers can see your conversations, adaptation history and measurements under that code. They never see your email.</p>
          <div className="row"><button className="btn alt" disabled={busy} onClick={() => setResearch(false)}>Stop taking part</button></div><p className="muted">Stopping hides your data from researchers from now on. To also erase what was stored, use “Erase cloud data” below.</p></>
          : <><p>Using Onconnect does not enroll you in research. If a study you have agreed to join asks you to, you can share your conversations and measurements with its researchers under a code instead of your name.</p>
            <label className="ck"><input type="checkbox" checked={ack.age} onChange={e => setAck({ ...ack, age: e.target.checked })} />I am 18 or older, or my parent or guardian has given permission and I agree to take part.</label>
            <label className="ck"><input type="checkbox" checked={ack.approved} onChange={e => setAck({ ...ack, approved: e.target.checked })} />I was invited by a study approved by a review committee (for example an IRB or science fair SRC).</label>
            <div className="row"><button className="btn" disabled={busy || !ack.age || !ack.approved} onClick={() => setResearch(true)}>Take part in research</button></div></>}</div>

      <div className="card"><h2>Delete my data</h2><p>Erase everything stored in the cloud for this account: conversations, reports, memory, adaptation history and shared research data. Data on this device is not touched.</p>
        {confirmDel ? <div className="row"><button className="btn" onClick={async () => { await deleteCloud(); setConfirmDel(false); setMsg("Cloud data erased."); }}>Yes, erase it</button><button className="btn alt" onClick={() => setConfirmDel(false)}>Cancel</button></div> : <div className="row"><button className="btn alt" onClick={() => setConfirmDel(true)}>Erase cloud data</button><button className="btn alt" onClick={requestDeletion}>Request account deletion</button></div>}
        {delReq && <p className="muted">{delReq}</p>}{msg && <p className="muted">{msg}</p>}</div></>}
  </>);
}
export default function AccountPage() { return <Suspense><Account /></Suspense>; }
