// Browser Supabase client. Returns null when the env vars are missing, so the app keeps working fully offline / local-only.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;   // either name works
export const supabaseConfigured = (): boolean => !!(URL_ && KEY);
let client: SupabaseClient | null | undefined;
export function supabase(): SupabaseClient | null {
  if (client === undefined) client = URL_ && KEY ? createBrowserClient(URL_, KEY) : null;
  return client;
}
