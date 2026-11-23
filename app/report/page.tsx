"use client";
import { useProfile } from "@/lib/store";
import { useChat } from "@/lib/chat";
import { GLOSSARY, TOPICS } from "@/lib/content";

const LABELS: Record<string, string> = {
  DEVELOPMENTAL_ADAPTATION: "Adjusted complexity to your age profile", VOCABULARY_DEFINED: "Defined unfamiliar medical words",
  STEPWISE_EXPLANATION: "Used step-by-step explanations", EXAMPLE_ADDED: "Added familiar comparisons", SHORT_FORMAT: "Kept explanations short",
  SIMPLIFIED_ON_REQUEST: "Simplified when you asked", EXPANDED_ON_REQUEST: "Added detail when you asked",
  SAFETY_INDIVIDUAL_ADVICE_REDIRECT: "Avoided individual medical advice and pointed you to your healthcare team", SAFETY_SUPPORT_REDIRECT: "Encouraged you to talk to a trusted adult",
};
export default function Report() {
  const { active, ready } = useChat(); const msgs = active?.msgs ?? []; const [profile] = useProfile();
  if (!ready) return null;
  const bots = msgs.filter(m => m.reply);
  const asked = msgs.filter(m => m.role === "user").length;
  const topicIds = [...new Set(bots.map(m => m.reply!.topicId).filter(Boolean) as string[])];
  const adapt = [...new Set(bots.flatMap(m => m.reply!.adaptations))];
  const terms = [...new Set(topicIds.flatMap(id => TOPICS.find(t => t.id === id)?.terms ?? []))];
  const sources = [...new Set(bots.map(m => m.reply!.source).filter(Boolean))];
  const fbs = bots.filter(m => m.feedback);
  if (!bots.length) return <div className="card"><h1>Your Onconnect Session Report</h1><p>No conversation yet. Ask a question first.</p></div>;
  return (<div className="card"><h1>Your Onconnect Session Report</h1>
    <h2>Overview</h2><ul><li>{new Date().toLocaleString()}</li><li>Questions asked: {asked}</li>
      <li>Topics: {topicIds.map(id => TOPICS.find(t => t.id === id)?.title).join(", ") || "none"}</li>
      <li>Selected age range: {profile.age}; detail: {profile.detail}</li></ul>
    <h2>Personalization applied</h2>{adapt.length ? <ul>{adapt.map(a => <li key={a}>{LABELS[a] ?? a}</li>)}</ul> : <p>None.</p>}
    <h2>Learning summary</h2><p>Medical words introduced: {terms.length ? terms.map(t => `${t}`).join(", ") : "none"}.</p>
    <ul>{terms.map(t => <li key={t}><b>{t}</b>: {GLOSSARY[t]}</li>)}</ul>
    <p className="muted">Reading a topic does not mean it was mastered, so understanding was not assessed.</p>
    <h2>Sources</h2><ul>{sources.map(s => <li key={s}>{s}</li>)}</ul>
    <h2>Your feedback</h2><p>{fbs.length ? fbs.map(m => m.feedback).join(", ") : "No feedback given."}</p>
    <h2>Limitations</h2><ul><li>Your diagnosis was not verified.</li><li>This is general educational information.</li><li>No emotional or psychological assessment was made.</li></ul>
    <button className="btn alt" onClick={() => window.print()}>Print</button></div>);
}
