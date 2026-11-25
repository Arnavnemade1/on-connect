# Supabase setup

Onconnect is local-first: it works with no backend. Supabase adds optional account sync and opt-in research sharing.

## 1. Create a project
Make a new Supabase project just for Onconnect (do not reuse a project that holds other data). Pick a region close to your users.

## 2. Apply the schema
Paste `migrations/20261124000000_onconnect_init.sql` into the SQL editor, or run `supabase link --project-ref <ref>` then `supabase db push`.

It creates:
| Table | Purpose | Who can read |
|---|---|---|
| `user_state` | One row per synced browser key (profile, chats, memory...) | the owner only |
| `research_answers` | Measurements for each answer (no text) | owner, and researchers |
| `study_responses` | Comprehension study rows | owner, and researchers |
| `clinician_ratings` | Clinician reviews of answers | owner, and researchers |

Every table has row level security on. Research tables are insert-only for signed-in users. `delete_my_data()` lets a user erase everything they sent.

## 3. Auth
Authentication > URL configuration: set **Site URL** to your production URL and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to **Redirect URLs**. Email (magic link) is the only provider the app uses.

## 4. Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
```
Set them in `.env.local` and in Vercel (Production and Preview). Never put the `service_role` key in the app.

## 5. Make a researcher account
Researchers see all shared rows. Grant the role from the SQL editor (it lives in `app_metadata`, which users cannot edit):
```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"researcher"}' where email = 'you@example.com';
```
Researchers read `research_answers_export` and `study_responses_export`, which hide account ids.

## Before real participants
Sharing is off by default. Do not enable it for children until your school or fair review committee (and a parent or guardian) has approved the study.
