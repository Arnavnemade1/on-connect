"use client";
import { useEffect, useState } from "react";
import { DEFAULT_PROFILE, type Profile, type Reply } from "./engine";

export interface Msg { id: string; role: "user" | "bot"; text: string; reply?: Reply; feedback?: "up" | "down" | "simpler" | "detail"; }
export interface Saved { questions: Record<string, string[]>; understood: string[]; }

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function useLocal<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [val, setVal] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => { setVal(load(key, fallback)); setReady(true); /* eslint-disable-next-line */ }, [key]);
  const set = (v: T | ((p: T) => T)) => setVal(prev => {
    const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    return next;
  });
  return [val, set, ready];
}
export const useProfile = () => useLocal<Profile>("onc.profile", DEFAULT_PROFILE);
export const useSaved = () => useLocal<Saved>("onc.saved", { questions: {}, understood: [] });
export interface LogEvent { id: string; session: string; ts: string; age: string; detail: string; format: string[]; topic: string | null; adaptations: string[]; source: string | null; coverage: number | null; grade: number | null; words: number | null; model: string; promptVersion: string; safety: string | null; clarification: string | null; feedback: string | null; }
export interface Bookmark { id: string; title: string; text: string; ts: string; }
export const useLog = () => useLocal<LogEvent[]>("onc.log", []);
export const useBookmarks = () => useLocal<Bookmark[]>("onc.bookmarks", []);
