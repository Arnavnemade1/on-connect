import React from "react";
// Minimal, safe markdown: paragraphs, bullet/numbered lists, **bold**, *italic*, `code`. Everything is rendered as React nodes (never as HTML).
function inline(s: string, k: string): React.ReactNode[] {
  const out: React.ReactNode[] = []; const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g; let last = 0, i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index)); const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={`${k}b${i++}`}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={`${k}c${i++}`}>{t.slice(1, -1)}</code>);
    else out.push(<em key={`${k}e${i++}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last)); return out;
}
export default function Md({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n"); const blocks: React.ReactNode[] = []; let para: string[] = []; let list: { ord: boolean; items: string[] } | null = null; let n = 0;
  const flushP = () => { if (para.length) { const k = `p${n++}`; blocks.push(<p key={k}>{para.flatMap((l, i) => [...inline(l, `${k}.${i}`), i < para.length - 1 ? <br key={`${k}br${i}`} /> : null])}</p>); para = []; } };
  const flushL = () => { if (list) { const k = `l${n++}`; const items = list.items.map((it, i) => <li key={i}>{inline(it, `${k}.${i}`)}</li>); blocks.push(list.ord ? <ol key={k}>{items}</ol> : <ul key={k}>{items}</ul>); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd(); const num = /^\s*\d+[.)]\s+(.*)$/.exec(line); const bul = /^\s*[-*•]\s+(.*)$/.exec(line); const head = /^#{1,6}\s+(.*)$/.exec(line);
    if (!line.trim()) { flushP(); flushL(); }
    else if (num) { flushP(); if (!list || !list.ord) { flushL(); list = { ord: true, items: [] }; } list.items.push(num[1]); }
    else if (bul) { flushP(); if (!list || list.ord) { flushL(); list = { ord: false, items: [] }; } list.items.push(bul[1]); }
    else if (head) { flushP(); flushL(); blocks.push(<p key={`h${n++}`}><strong>{inline(head[1], `h${n}`)}</strong></p>); }
    else { flushL(); para.push(line); }
  }
  flushP(); flushL(); return <div className="md">{blocks}</div>;
}
