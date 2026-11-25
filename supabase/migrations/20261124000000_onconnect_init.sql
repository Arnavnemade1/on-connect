-- Onconnect schema v1.
-- Apply with `supabase db push`, or paste into the SQL editor of a Supabase project made for Onconnect.
-- Design: local-first app. Personal data syncs to `user_state` (owner only). Research data is opt-in, structured only (no chat text),
-- insert-only for signed-in users, and readable only by accounts whose app_metadata.role = 'researcher'.

-- ---------------------------------------------------------------- helpers
create or replace function public.is_researcher() returns boolean
language sql stable set search_path = '' as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'researcher', false) $$;

-- ---------------------------------------------------------------- personal sync (one row per localStorage key)
create table if not exists public.user_state (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null check (char_length(key) between 1 and 64 and key like 'onc.%'),
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.user_state enable row level security;
create policy user_state_select on public.user_state for select to authenticated using (user_id = (select auth.uid()));
create policy user_state_insert on public.user_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy user_state_update on public.user_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_state_delete on public.user_state for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- research: one row per generated answer (structured fields only)
create table if not exists public.research_answers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  row_id         text not null,
  created_at     timestamptz not null default now(),
  session_id     text,
  age_band       text check (age_band in ('6-8','9-11','12-14','15-17')),
  detail         text, mode text check (mode in ('adaptive','age','baseline')), lang text, topic text,
  model          text, prompt_version text,
  target_grade   numeric, grade numeric, words int, coverage numeric, level_shift int,
  adaptations    text[] not null default '{}', signals text[] not null default '{}',
  safety         text, clarification text, feedback text,
  unique (user_id, row_id)
);

-- ---------------------------------------------------------------- research: comprehension study responses
create table if not exists public.study_responses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  row_id     text not null,
  created_at timestamptz not null default now(),
  pid        text,                                   -- participant code chosen by the researcher, never a name
  condition  text not null check (condition in ('adapted','generic')),
  topic      text, age text, score int check (score >= 0), total int check (total > 0),
  self_rated int check (self_rated between 0 and 5), ms int check (ms >= 0), grade numeric,
  unique (user_id, row_id)
);

-- ---------------------------------------------------------------- research: clinician review of answers
create table if not exists public.clinician_ratings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  row_id     text not null,
  created_at timestamptz not null default now(),
  topic      text, decision text,
  accuracy   int check (accuracy between 0 and 5), age_fit int check (age_fit between 0 and 5), safety int check (safety between 0 and 5),
  comment    text check (char_length(comment) <= 500),
  rater      text,
  unique (user_id, row_id)
);

-- ---------------------------------------------------------------- RLS for the three research tables
do $$ declare t text; begin
  foreach t in array array['research_answers','study_responses','clinician_ratings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()) or public.is_researcher())', t || '_select', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete', t);
    execute format('create index if not exists %I on public.%I (user_id, created_at desc)', t || '_user_idx', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- researcher exports: pseudonymous (no user_id), RLS still applies
create or replace view public.research_answers_export with (security_invoker = true) as
  select substr(md5(user_id::text), 1, 10) as participant, created_at, session_id, age_band, detail, mode, lang, topic, model, prompt_version,
         target_grade, grade, words, coverage, level_shift, adaptations, signals, safety, clarification, feedback from public.research_answers;
create or replace view public.study_responses_export with (security_invoker = true) as
  select substr(md5(user_id::text), 1, 10) as account, created_at, pid, condition, topic, age, score, total, self_rated, ms, grade from public.study_responses;

revoke all on public.research_answers_export, public.study_responses_export from anon, public;

-- ---------------------------------------------------------------- withdraw: a signed-in user can erase everything they sent
create or replace function public.delete_my_data() returns void
language plpgsql security invoker set search_path = public as $$
begin
  delete from public.user_state        where user_id = auth.uid();
  delete from public.research_answers  where user_id = auth.uid();
  delete from public.study_responses   where user_id = auth.uid();
  delete from public.clinician_ratings where user_id = auth.uid();
end $$;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
