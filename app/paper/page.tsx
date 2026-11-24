"use client";
import { useMemo } from "react";
import { useLocal, useLog, useStudy, type LogEvent } from "@/lib/store";
import { buildPaper, wordCount } from "@/lib/paper";
import type { MemRun, Run } from "@/lib/eval";

const dl = (n: string, t: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/markdown" })); a.download = n; a.click(); };

function Doc({ md }: { md: string }) {
  const out: React.ReactNode[] = []; let list: string[] = []; let k = 0;
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((t, i) => t.startsWith("**") ? <strong key={i}>{t.slice(2, -2)}</strong> : t.startsWith("_") && t.endsWith("_") && t.length > 2 ? <em key={i}>{t.slice(1, -1)}</em> : t);
  const flush = () => { if (list.length) { out.push(<ul key={k++}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; } };
  for (const line of md.split("\n")) {
    if (/^- /.test(line)) { list.push(line.slice(2)); continue; } flush();
    if (/^# /.test(line)) out.push(<h1 key={k++}>{line.slice(2)}</h1>); else if (/^## /.test(line)) out.push(<h2 key={k++}>{line.slice(3)}</h2>); else if (/^### /.test(line)) out.push(<h3 key={k++}>{line.slice(4)}</h3>);
    else if (/^\d+\. /.test(line)) out.push(<p key={k++} className="refline">{line}</p>); else if (line.trim()) out.push(<p key={k++}>{inline(line)}</p>);
  }
  flush(); return <div className="paper">{out}</div>;
}

export default function Paper() {
  const [runs] = useLocal<Run[]>("onc.eval", []); const [mruns] = useLocal<MemRun[]>("onc.evalmem", []); const [stamp] = useLocal<string>("onc.evalstamp", ""); const [log] = useLog(); const [study] = useStudy();
  const { abstract, body } = useMemo(() => buildPaper({ runs, mruns, log: log as LogEvent[], study, stamp }), [runs, mruns, log, study, stamp]);
  const wc = wordCount(abstract);
  return (<>
    <div className="eyebrow">Research · Paper</div><h1>Paper draft from your data</h1>
    <p>A write-up assembled from the evaluation harness, audit log and study data in this browser. Numbers are filled in automatically; anything missing is marked. Re-run the experiments and this page updates.</p>
    <div className="callout"><b>A draft, not a result.</b> It states only what the data show, flags missing pieces, and keeps the limitations. Check every sentence and every reference before it goes on a board or into a submission.</div>
    <div className="row" style={{ marginTop: 0, marginBottom: 14 }}><button className="btn" onClick={() => dl("onconnect-paper-draft.md", body)}>Download Markdown</button><button className="btn alt" onClick={() => navigator.clipboard?.writeText(body)}>Copy</button><button className="btn alt" onClick={() => window.print()}>Print / PDF</button>
      <span className={"tag"} style={{ marginLeft: "auto" }}>Abstract {wc} words{wc > 250 ? " · over 250" : ""}</span></div>
    <div className="card"><Doc md={body} /></div>
  </>);
}
