"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/store";
import { TOPICS, PROFILES, type Level } from "@/lib/content";
import type { Profile } from "@/lib/engine";

const CONCERNS = ["I don't know what will happen", "I'm confused about medical words", "I'm worried about pain or discomfort", "I'm worried about missing school", "I have questions I don't know how to ask"];
const FORMATS: [Profile["format"][number], string][] = [["steps", "Step by step"], ["examples", "Give me examples"], ["define", "Explain medical words"], ["check", "Ask me if I understand"]];

export default function Setup() {
  const [saved, setSaved] = useProfile();
  const [p, setP] = useState<Profile>(saved);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  if (!loaded && saved.updatedAt) { setP(saved); setLoaded(true); }
  const router = useRouter();
  const toggle = <T,>(arr: T[], v: T) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) =>
    <button type="button" className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={onClick}>{children}</button>;
  const steps = 4;
  return (<div className="card">
    <div className="progress"><i style={{ width: `${((step + 1) / steps) * 100}%` }} /></div>
    <p className="muted">Step {step + 1} of {steps} · Everything is optional and you can change it any time.</p>
    {step === 0 && <><h1>Who is using Onconnect?</h1>
      <div className="chips">{([["child", "I'm the patient"], ["caregiver", "I'm a parent or caregiver"], ["together", "We're using it together"]] as const).map(([v, l]) =>
        <Chip key={v} on={p.role === v} onClick={() => setP({ ...p, role: v })}>{l}</Chip>)}</div>
      <label>Age range</label>
      <div className="chips">{(Object.keys(PROFILES) as Level[]).map(a => <Chip key={a} on={p.age === a} onClick={() => setP({ ...p, age: a })}>{a}</Chip>)}</div></>}
    {step === 1 && <><h1>What would you like help understanding?</h1>
      <div className="chips">{TOPICS.map(t => <Chip key={t.id} on={p.topics.includes(t.id)} onClick={() => setP({ ...p, topics: toggle(p.topics, t.id) })}>{t.title}</Chip>)}</div>
      <label>Anything you're particularly concerned about? (optional)</label>
      <div className="chips">{CONCERNS.map(c => <Chip key={c} on={p.concerns.includes(c)} onClick={() => setP({ ...p, concerns: toggle(p.concerns, c) })}>{c}</Chip>)}</div>
      <p className="muted">You never have to share a diagnosis. What you enter here is not verified by a healthcare professional.</p></>}
    {step === 2 && <><h1>How should Onconnect explain things?</h1>
      <div className="chips">{(["short", "balanced", "detailed"] as const).map(d => <Chip key={d} on={p.detail === d} onClick={() => setP({ ...p, detail: d })}>{d === "short" ? "Short" : d === "balanced" ? "Balanced" : "Detailed"}</Chip>)}</div>
      <label>Also…</label>
      <div className="chips">{FORMATS.map(([v, l]) => <Chip key={v} on={p.format.includes(v)} onClick={() => setP({ ...p, format: toggle(p.format, v) })}>{l}</Chip>)}</div></>}
    {step === 3 && <><h1>Here is what Onconnect knows about how you want to learn</h1>
      <ul><li>Role: {p.role}</li><li>Age range: {p.age} ({PROFILES[p.age]})</li><li>Detail: {p.detail}</li>
        <li>Preferences: {p.format.join(", ") || "none"}</li><li>Topics: {p.topics.map(id => TOPICS.find(t => t.id === id)?.title).join(", ") || "none selected"}</li>
        <li>Concerns: {p.concerns.join("; ") || "none shared"}</li></ul>
      <p className="muted">Entered by you · not verified by a healthcare professional.{saved.updatedAt && ` Last updated ${new Date(saved.updatedAt).toLocaleString()}.`}</p>
      {p.topics.length > 0 && <><h2>Your learning plan</h2><ol>{p.topics.map(id => <li key={id}>Understand: {TOPICS.find(t => t.id === id)?.title} <span className="muted">— recommended because you selected it.</span></li>)}</ol></>}</>}
    <div className="row" style={{ marginTop: 24 }}>
      {step > 0 && <button className="btn alt" onClick={() => setStep(step - 1)}>Back</button>}
      {step < steps - 1 ? <button className="btn" onClick={() => setStep(step + 1)}>Next</button>
        : <button className="btn" onClick={() => { setSaved({ ...p, updatedAt: new Date().toISOString() }); router.push("/chat"); }}>Save and start</button>}
      {step < steps - 1 && <button className="btn alt" onClick={() => setStep(steps - 1)}>Skip</button>}
    </div></div>);
}
