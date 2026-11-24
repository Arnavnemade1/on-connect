import Link from "next/link";
export default function NotFound() { return (<div className="page"><div className="card"><h1>Page not found</h1><p className="muted">That page doesn&apos;t exist.</p><Link className="btn" href="/chat">Back to chat</Link></div></div>); }
