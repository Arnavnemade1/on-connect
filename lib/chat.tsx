"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Msg } from "./store";

export interface Convo { id: string; title: string; ts: string; msgs: Msg[]; }
interface Ctx { convos: Convo[]; active?: Convo; activeId: string | null; ready: boolean;
  newChat: () => void; select: (id: string) => void; remove: (id: string) => void; clearAll: () => void;
  addMsg: (m: Msg) => string; patchMsg: (id: string, p: Partial<Msg>) => void; }
const C = createContext<Ctx>(null as unknown as Ctx);
export const useChat = () => useContext(C);
const uid = () => Math.random().toString(36).slice(2, 10);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const ref = useRef<string | null>(null);
  useEffect(() => {
    try { setConvos(JSON.parse(localStorage.getItem("onc.convos") || "[]")); const a = localStorage.getItem("onc.active"); ref.current = a; setActive(a); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (!ready) return; try { localStorage.setItem("onc.convos", JSON.stringify(convos)); localStorage.setItem("onc.active", activeId ?? ""); } catch {} }, [convos, activeId, ready]);
  const select = useCallback((id: string) => { ref.current = id; setActive(id); }, []);
  const newChat = useCallback(() => { ref.current = null; setActive(null); }, []);
  const remove = useCallback((id: string) => { setConvos(c => c.filter(x => x.id !== id)); if (ref.current === id) { ref.current = null; setActive(null); } }, []);
  const clearAll = useCallback(() => { setConvos([]); ref.current = null; setActive(null); }, []);
  const addMsg = useCallback((m: Msg) => {
    let id = ref.current;
    if (!id) { id = uid(); ref.current = id; setActive(id); const nid = id;
      setConvos(c => [{ id: nid, title: m.text.slice(0, 48), ts: new Date().toISOString(), msgs: [m] }, ...c]); return nid; }
    const cid = id; setConvos(c => c.map(x => x.id === cid ? { ...x, msgs: [...x.msgs, m] } : x)); return cid;
  }, []);
  const patchMsg = useCallback((mid: string, p: Partial<Msg>) => setConvos(c => c.map(x => ({ ...x, msgs: x.msgs.map(m => m.id === mid ? { ...m, ...p } : m) }))), []);
  const active = convos.find(c => c.id === activeId);
  return <C.Provider value={{ convos, active, activeId, ready, newChat, select, remove, clearAll, addMsg, patchMsg }}>{children}</C.Provider>;
}
