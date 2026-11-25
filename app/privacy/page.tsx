"use client";
export default function Privacy() {
  const keys = () => Object.keys(localStorage).filter(k => k.startsWith("onc."));
  const exp = () => { const o: Record<string, unknown> = {}; keys().forEach(k => { try { o[k] = JSON.parse(localStorage.getItem(k)!); } catch { o[k] = localStorage.getItem(k); } }); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: "application/json" })); a.download = "onconnect-my-data.json"; a.click(); };
  const del = () => { if (confirm("Delete ALL Onconnect data in this browser? This cannot be undone.")) { keys().forEach(k => localStorage.removeItem(k)); location.href = "/"; } };
  return (<><div className="eyebrow">Privacy</div><h1>Privacy and your data</h1>
    <div className="card"><h2>Where your data lives</h2><ul><li>Profile, chats, memory, questions, check-ins and saved items are stored <b>in this browser</b>. If you sign in on the <a href="/account">Account</a> page they are also copied to your private cloud account so they can follow you between devices. Without signing in, nothing is saved on a server.</li>
      <li>When you ask a question, the question text, your age range, preferences and any notes you wrote in your profile are sent through this app&apos;s server to an AI model provider (OpenRouter, which routes to the model) to write the answer.</li>
      <li>Please don&apos;t enter names, addresses, or other identifying details.</li><li>Nothing is shared with caregivers or clinicians. Optional research sharing sends only measurements, never your text, and is off unless you switch it on in <a href="/account">Account</a>.</li></ul></div>
    <div className="card"><h2>Your controls</h2><div className="row"><button className="btn" onClick={exp}>Export my data (JSON)</button><button className="btn alt" onClick={del}>Delete all my data</button></div></div></>);
}
