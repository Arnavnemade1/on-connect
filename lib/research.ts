// Opt-in research sharing. Nothing is sent unless (1) Supabase is configured, (2) the user is signed in and (3) they switched sharing on.
// Only structured fields are shared: no chat text, no profile notes, no names. Rows are keyed by user so people can withdraw (delete_my_data()).
import { supabase, supabaseConfigured } from "./supabase/client";
import type { LogEvent, Rating, StudyRow } from "./store";

export const SHARE_KEY = "onc.share";
export const sharingOn = (): boolean => { try { return supabaseConfigured() && localStorage.getItem(SHARE_KEY) === "1"; } catch { return false; } };
const clip = (s: string | undefined | null, n = 64) => (s ? String(s).slice(0, n) : null);

async function send(table: string, row: Record<string, unknown>) {
  if (!sharingOn()) return; const sb = supabase(); if (!sb) return;
  const { data } = await sb.auth.getSession(); if (!data.session) return;
  await sb.from(table).upsert(row, { onConflict: "user_id,row_id", ignoreDuplicates: true });
}
export const answerRow = (e: LogEvent) => ({ row_id: e.id, session_id: clip(e.session), created_at: e.ts, age_band: e.age, detail: clip(e.detail, 16), mode: clip(e.mode, 16), lang: clip(e.lang, 8), topic: clip(e.topic), model: clip(e.model),
  prompt_version: clip(e.promptVersion), target_grade: e.targetGrade ?? null, grade: e.grade ?? null, words: e.words ?? null, coverage: e.coverage ?? null, level_shift: e.levelShift ?? null,
  adaptations: (e.adaptations ?? []).slice(0, 16).map(a => String(a).slice(0, 48)), signals: (e.signals ?? []).slice(0, 16).map(a => String(a).slice(0, 48)), safety: clip(e.safety, 48), clarification: clip(e.clarification, 32), feedback: clip(e.feedback ?? undefined, 16) });
export const studyRow = (r: StudyRow) => ({ row_id: r.id, pid: clip(r.pid, 32), condition: r.condition, topic: clip(r.topic), age: clip(r.age, 8), score: r.score, total: r.total, self_rated: r.selfRated, ms: r.ms, grade: r.grade });
export const ratingRow = (r: Rating) => ({ row_id: r.id, topic: clip(r.topic), decision: clip(r.decision, 32), accuracy: r.accuracy, age_fit: r.ageFit, safety: r.safety, comment: clip(r.comment, 500), rater: clip(r.rater, 48) });
export const shareAnswer = (e: LogEvent) => send("research_answers", answerRow(e));
export const shareStudy = (r: StudyRow) => send("study_responses", studyRow(r));
export const shareRating = (r: Rating) => send("clinician_ratings", ratingRow(r));
