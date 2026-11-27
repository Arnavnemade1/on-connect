"use client";
// Patient profile (spec 6.1, 22.6): optional, gradual, easy to correct. Medical details are labelled as user-provided and never verified.
// Every save is versioned with what changed (22.6 E). Memory is shown with full correction controls (22.2).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocal, useMemory, useProfile } from "@/lib/store";
import { DEFAULT_MEMORY } from "@/lib/memory";
import { LEVELS, PROFILES, TOPICS } from "@/lib/content";
import { CARE_STAGES, DEFAULT_PROFILE, type Profile } from "@/lib/engine";
import { LANGS } from "@/lib/langs";
import MemoryPanel from "@/components/MemoryPanel";

const CONCERNS = ["I don't know what will happen", "I'm confused about medical words", "I'm worried about pain or discomfort", "I'm worried about missing school", "I have questions I don't know how to ask"];
const FORMATS: [Profile["format"][number], string][] = [["steps", "Step by step"], ["examples", "Give me examples"], ["define", "Explain medical words"], ["check", "Check that I understand"]];
const PROCS = ["biopsy", "ct", "mri", "ultrasound", "bloodtest", "catheter", "embolization", "ablation"];
/** The spec's own example statements (22.6 D), each mapped to the settings it implies. They are preferences, never diagnoses. */
const STATEMENTS: [string, (p: Profile) => Profile][] = [
  ["I want things explained in really simple words.", p => ({ ...p, detail: "short", format: [...new Set([...p.format, "define" as const])] })],
  ["I want to know exactly what will happen.", p => ({ ...p, format: [...new Set([...p.format, "steps" as const])] })],
  ["I get nervous when I don't know what to expect.", p => ({ ...p, format: [...new Set([...p.format, "steps" as const])], concerns: [...new Set([...p.concerns, "I don't know what will happen"])] })],
  ["I like examples.", p => ({ ...p, format: [...new Set([...p.format, "examples" as const])] })],
  ["I prefer short explanations.", p => ({ ...p, detail: "short" })],
  ["I want more details when I ask questions.", p => ({ ...p, detail: "detailed" })],
  ["Please explain medical words when you use them.", p => ({ ...p, format: [...new Set([...p.format, "define" as const])] })],
];
interface Version { ts: string; changes: string[]; }
const FIELDS: [keyof Profile, string][] = [["role", "Role"], ["name", "Preferred name"], ["age", "Age range"], ["lang", "Language"], ["caregiver", "Caregiver involvement"], ["accessibility", "Accessibility"], ["stage", "Care stage"], ["procedures", "Procedures"], ["diagnosis", "Diagnosis (user-provided)"], ["topics", "Topics"], ["concerns", "Concerns"], ["detail", "Detail"], ["format", "Preferences"], ["notes", "Notes"]];
const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") || "none" : typeof v === "string" ? (v.length > 60 ? `${v.length} characters` : v || "none") : String(v ?? "none"));

export default function Setup() {
  const [saved, setSaved] = useProfile(); const [memory, setMemory] = useMemory(); const [hist, setHist] = useLocal<Version[]>("onc.profilehist", []);
  const [p, setP] = useState<Profile>(saved); const [step, setStep] = useState(0); const [loaded, setLoaded] = useState(false); const [stmts, setStmts] = useState<string[]>([]); const [confirmReset, setConfirmReset] = useState(false);
  if (!loaded && saved.updatedAt) { setP({ ...DEFAULT_PROFILE, ...saved }); setLoaded(true); }
  const router = useRouter();
  const toggle = <T,>(arr: T[] = [], v: T) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => <button type="button" className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={onClick}>{children}</button>;
  const steps = 6;
  const save = () => {
    const next = { ...p, updatedAt: new Date().toISOString() };
    const changes = FIELDS.filter(([k]) => JSON.stringify(saved[k] ?? "") !== JSON.stringify(next[k] ?? "")).map(([k, l]) => `${l}: ${show(saved[k])} → ${show(next[k])}`);
    if (changes.length) setHist(h => [...h, { ts: next.updatedAt, changes }].slice(-50));
    setSaved(next); router.push("/chat");
  };
  return (<>
    <div className="eyebrow">Your profile</div><h1>How Onconnect should talk with you</h1>
    <p>Everything here is optional and you can change it any time. Start with a little, and add more when it helps.</p>
    <div className="card">
      <div className="progress"><i style={{ width: `${((step + 1) / steps) * 100}%` }} /></div>
      <p className="muted">Step {step + 1} of {steps}</p>
      {step === 0 && <><h2>About you</h2>
        <label>Who is using Onconnect?</label>
        <div className="chips">{([["child", "I'm the patient"], ["caregiver", "I'm a parent or caregiver"], ["together", "We're using it together"]] as const).map(([v, l]) => <Chip key={v} on={p.role === v} onClick={() => setP({ ...p, role: v })}>{l}</Chip>)}</div>
        <label htmlFor="nm">What should Onconnect call you? <span className="muted">(a nickname is fine)</span></label><input id="nm" type="text" maxLength={40} value={p.name ?? ""} onChange={e => setP({ ...p, name: e.target.value })} placeholder="Optional" />
        <label>Age range</label><div className="chips">{LEVELS.map(a => <Chip key={a} on={p.age === a} onClick={() => setP({ ...p, age: a })}>{a} <span className="muted">{PROFILES[a]}</span></Chip>)}</div>
        <p className="muted">Age sets a starting point for how things are explained. It is never treated as a measure of what someone understands.</p>
        <label>Language for answers</label><div className="chips">{LANGS.map(l => <Chip key={l.code} on={(p.lang ?? "en") === l.code} onClick={() => setP({ ...p, lang: l.code })}>{l.native}</Chip>)}</div>
        <p className="muted">Non-English answers are written by the AI model and have not been checked by a medical translator.</p>
        {p.role !== "caregiver" && <><label>Should a parent or caregiver be part of explanations?</label><div className="chips">{([["yes", "Yes"], ["sometimes", "Sometimes"], ["no", "Not usually"]] as const).map(([v, l]) => <Chip key={v} on={p.caregiver === v} onClick={() => setP({ ...p, caregiver: p.caregiver === v ? "" : v })}>{l}</Chip>)}</div></>}
        <label htmlFor="acc">Anything that makes reading or listening easier? <span className="muted">(optional)</span></label><input id="acc" type="text" maxLength={400} value={p.accessibility ?? ""} onChange={e => setP({ ...p, accessibility: e.target.value })} placeholder="For example: larger text, short paragraphs, read aloud" /></>}
      {step === 1 && <><h2>Medical situation <span className="muted">(optional)</span></h2>
        <p className="muted">Only share what you want to. Onconnect treats everything here as information you gave it, not as a verified medical record, and never assumes it is correct.</p>
        <label>Where are you in the journey?</label><div className="chips">{CARE_STAGES.map(([v, l]) => <Chip key={v} on={p.stage === v} onClick={() => setP({ ...p, stage: p.stage === v ? "" : v })}>{l}</Chip>)}</div>
        <label>Procedures you are preparing for or have had</label><div className="chips">{PROCS.map(id => <Chip key={id} on={(p.procedures ?? []).includes(id)} onClick={() => setP({ ...p, procedures: toggle(p.procedures, id) })}>{TOPICS.find(t => t.id === id)?.title}</Chip>)}</div>
        <label htmlFor="dx">Diagnosis, if you choose to share it</label><input id="dx" type="text" maxLength={200} value={p.diagnosis ?? ""} onChange={e => setP({ ...p, diagnosis: e.target.value })} placeholder="Optional. You never have to share this." /></>}
      {step === 2 && <><h2>What you want to understand</h2>
        <div className="chips">{TOPICS.map(t => <Chip key={t.id} on={p.topics.includes(t.id)} onClick={() => setP({ ...p, topics: toggle(p.topics, t.id) })}>{t.title}</Chip>)}</div>
        <label>Anything you are worried about?</label><div className="chips">{CONCERNS.map(c => <Chip key={c} on={p.concerns.includes(c)} onClick={() => setP({ ...p, concerns: toggle(p.concerns, c) })}>{c}</Chip>)}</div></>}
      {step === 3 && <><h2>How you like things explained</h2>
        <label>Pick any that sound like you</label>
        <div className="chips">{STATEMENTS.map(([t, f]) => <Chip key={t} on={stmts.includes(t)} onClick={() => { if (!stmts.includes(t)) { setP(f(p)); setStmts([...stmts, t]); } else setStmts(stmts.filter(x => x !== t)); }}>{t}</Chip>)}</div>
        <p className="muted">These are preferences, not a description of how you feel or who you are.</p>
        <label>How much detail?</label><div className="chips">{(["short", "balanced", "detailed"] as const).map(d => <Chip key={d} on={p.detail === d} onClick={() => setP({ ...p, detail: d })}>{d === "short" ? "Short" : d === "balanced" ? "Balanced" : "Detailed"}</Chip>)}</div>
        <label>Also</label><div className="chips">{FORMATS.map(([v, l]) => <Chip key={v} on={p.format.includes(v)} onClick={() => setP({ ...p, format: toggle(p.format, v) })}>{l}</Chip>)}</div></>}
      {step === 4 && <><h2>In your own words</h2>
        <p className="muted">What you are going through, what you have been told, what confuses you, how you like to learn. It is optional and not a medical record.</p>
        <textarea className="big" value={p.notes ?? ""} maxLength={4000} onChange={e => setP({ ...p, notes: e.target.value })} placeholder="In your own words…" aria-label="Notes for Onconnect" />
        <div className="muted" style={{ textAlign: "right" }}>{(p.notes ?? "").length} / 4000</div>
        <p className="muted">Notes go to the AI model with your questions, marked as unverified, so answers can be more relevant.</p></>}
      {step === 5 && <><h2>Review</h2>
        <table><tbody>{FIELDS.map(([k, l]) => <tr key={k}><td className="muted">{l}</td><td>{k === "stage" ? CARE_STAGES.find(s => s[0] === p.stage)?.[1] ?? "none" : k === "procedures" ? (p.procedures ?? []).map(id => TOPICS.find(t => t.id === id)?.title).join(", ") || "none" : k === "topics" ? p.topics.map(id => TOPICS.find(t => t.id === id)?.title).join(", ") || "none" : show(p[k])}</td></tr>)}</tbody></table>
        <p className="muted">Entered by you, not verified by a healthcare professional.{saved.updatedAt && ` Last saved ${new Date(saved.updatedAt).toLocaleString()}.`}</p></>}
      <div className="row" style={{ marginTop: 24 }}>
        {step > 0 && <button className="btn alt" onClick={() => setStep(step - 1)}>Back</button>}
        {step < steps - 1 ? <button className="btn" onClick={() => setStep(step + 1)}>Next</button> : <button className="btn" onClick={save}>Save and start</button>}
        {step < steps - 1 && <button className="btn alt" onClick={() => setStep(steps - 1)}>Skip to review</button>}
      </div></div>

    <div className="card" id="memory"><div className="eyebrow">Memory and personalization</div><h2>What Onconnect remembers, and why</h2>
      <p className="muted">Changes from a single request last for that conversation only. Things you state directly, or ask for twice, are saved as preferences. You can undo or correct any of it.</p>
      <MemoryPanel memory={memory} setMemory={setMemory} profile={saved} conv={null} />
      <div className="row">{confirmReset ? <><button className="btn" onClick={() => { setMemory(DEFAULT_MEMORY); setConfirmReset(false); }}>Yes, clear all memory</button><button className="btn alt" onClick={() => setConfirmReset(false)}>Cancel</button></> : <button className="btn alt" onClick={() => setConfirmReset(true)}>Clear all memory</button>}</div></div>

    {hist.length > 0 && <div className="card"><div className="eyebrow">Profile history</div><h2>Every saved change</h2>
      <ol className="plain">{[...hist].reverse().map(v => <li key={v.ts}><b>{new Date(v.ts).toLocaleString()}</b><ul>{v.changes.map(c => <li key={c} className="muted">{c}</li>)}</ul></li>)}</ol></div>}
    <p className="muted">Your data stays in this browser unless you sign in. <Link href="/privacy">Privacy and data controls</Link></p>
  </>);
}
