"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useChat } from "@/lib/chat";
import { useLog, useMemory, useProfile } from "@/lib/store";
import { langOf } from "@/lib/langs";

const STARTERS = ["What happens during a biopsy?", "What is an MRI?", "What does chemotherapy do?"];
const STEPS: [string, string][] = [
  ["Profile", "Your age band, preferred detail, language and notes set the starting level."],
  ["Memory", "Saying “simpler” or “I don't get it” changes later answers in the same chat."],
  ["Generate", "The model answers from approved content when there is some, from general knowledge when not."],
  ["Check", "Reading level, length and safety are checked, then every step is logged."],
];
const LINKS: [string, [string, string][]][] = [
  ["Learn", [["/procedures", "Procedure explorer"], ["/anatomy", "Anatomy"], ["/words", "Medical words"], ["/dashboard", "Dashboard"]]],
  ["Support", [["/feelings", "My feelings"], ["/questions", "My questions"], ["/family", "Family and school"]]],
  ["Research", [["/eval", "Evaluation harness"], ["/study", "Comprehension study"], ["/protocol", "Protocol and power"], ["/analysis", "Data analysis"], ["/literature", "Literature map"], ["/paper", "Paper draft"]]],
];

export default function Home() {
  const router = useRouter(); const [q, setQ] = useState(""); const { convos, select } = useChat(); const [log] = useLog(); const [mem] = useMemory(); const [p] = useProfile();
  const ask = (t: string) => { if (t.trim()) router.push(`/chat?q=${encodeURIComponent(t.trim())}`); };
  const graded = log.filter(e => e.grade != null && e.targetGrade != null); const within = graded.filter(e => Math.abs(e.grade! - e.targetGrade!) <= 2).length;
  return (<>
    <section className="hero">
      <h1>Medical explanations that adjust to the reader</h1>
      <p>Onconnect explains procedures and scans to children with cancer and their families. It changes the wording as you tell it what works, and it records how each answer was made so it can be checked.</p>
      <form className="ask" onSubmit={e => { e.preventDefault(); ask(q); }}>
        <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about a procedure, scan or medical word" aria-label="Ask a question" />
        <button className="btn" aria-label="Ask">Ask <ArrowRight size={15} /></button>
      </form>
      <div className="chips">{STARTERS.map(s => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}</div>
      {!p.updatedAt && <p className="muted" style={{ marginTop: 14 }}>You can <Link href="/setup">set up a profile</Link> so answers match your age, language and preferences.</p>}
    </section>

    <div className="kpi">
      <div><b>{log.length}</b><span>Answers logged</span></div>
      <div><b>{graded.length ? Math.round((within / graded.length) * 100) + "%" : "–"}</b><span>Within 2 grades of target</span></div>
      <div><b>{mem.turns}</b><span>Turns learned from</span></div>
      <div><b>{langOf(p.lang).native}</b><span>Answer language</span></div></div>

    <div className="sect"><h2>How an answer is made</h2><Link href="/report" className="muted">Algorithm report</Link></div>
    <div className="flowrow">{STEPS.map(([t, d], i) => <div key={t} className="flowcard"><div className="n">{i + 1}</div><h3>{t}</h3><p>{d}</p></div>)}</div>

    {convos.length > 0 && <><div className="sect"><h2>Recent chats</h2><Link href="/chat" className="muted">Open chat</Link></div>
      <div className="listlinks">{convos.slice(0, 4).map(c => <button key={c.id} onClick={() => { select(c.id); router.push("/chat"); }}><span>{c.title || "New chat"}</span><span className="muted">{c.msgs.length} messages · {new Date(c.ts).toLocaleDateString()}</span></button>)}</div></>}

    <div className="sect"><h2>Everything else</h2></div>
    <div className="cols4">{LINKS.map(([g, ls]) => <div key={g}><div className="eyebrow">{g}</div><div className="listlinks">{ls.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}</div></div>)}</div>
  </>);
}
