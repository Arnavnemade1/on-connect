"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (<div className="page"><div className="card"><div className="eyebrow">Something went wrong</div><h1>This page hit a problem</h1>
    <p className="muted">{error.message}</p>
    <p>This can happen if data saved by an older version of the app doesn&apos;t match what this page expects. Trying again usually works. If it keeps happening, you can clear the data saved in this browser (it can&apos;t be undone).</p>
    <div className="row"><button className="btn" onClick={reset}>Try again</button>
      <button className="btn alt" onClick={() => { if (confirm("Delete all Onconnect data saved in this browser?")) { Object.keys(localStorage).filter(k => k.startsWith("onc.")).forEach(k => localStorage.removeItem(k)); location.href = "/"; } }}>Clear saved data</button></div></div></div>);
}
