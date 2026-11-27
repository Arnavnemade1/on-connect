-- Onconnect schema v0.6: structured longitudinal storage, research admin, community resources (spec 21.2–21.4, 22.1–22.2, 22.7).
-- Privileged roles live in auth app_metadata (set only by a system administrator), never in user-editable tables.

-- ---------------------------------------------------------------- roles
create or replace function public.is_researcher() returns boolean
language sql stable set search_path = '' as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('researcher', 'admin'), false) $$;
create or replace function public.is_admin() returns boolean
language sql stable set search_path = '' as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

-- ---------------------------------------------------------------- five developmental profiles
alter table public.research_answers drop constraint if exists research_answers_age_band_check;
alter table public.research_answers add constraint research_answers_age_band_check check (age_band in ('3-5','6-8','9-12','13-15','16-18','9-11','12-14','15-17'));

-- ---------------------------------------------------------------- participant profile (pseudonymous; no names or contact details)
create table if not exists public.profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  pseudonym        text not null unique default ('P-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  user_type        text not null default 'patient' check (user_type in ('patient', 'caregiver', 'together')),
  age_band         text check (age_band in ('3-5','6-8','9-12','13-15','16-18')),
  care_stage       text,
  research_consent boolean not null default false,
  consent_at       timestamptz,
  consent_version  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- conversations and messages
create table if not exists public.conversations (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null check (char_length(id) between 4 and 40),
  title      text check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.messages (
  user_id         uuid not null references auth.users(id) on delete cascade,
  id              text not null check (char_length(id) between 4 and 40),
  conversation_id text not null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null check (char_length(content) <= 20000),
  report          jsonb,                       -- message-level adaptation report (spec 9.1); null for user messages
  created_at      timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, conversation_id) references public.conversations(user_id, id) on delete cascade
);
create index if not exists messages_conv_idx on public.messages (user_id, conversation_id, created_at);

-- ---------------------------------------------------------------- adaptation events (spec 8.3, 22.1)
create table if not exists public.adaptation_events (
  user_id         uuid not null references auth.users(id) on delete cascade,
  id              text not null,
  conversation_id text,
  message_id      text,
  ts              timestamptz not null default now(),
  parameter       text not null,
  prev            int not null,
  next            int not null,
  scope           text not null check (scope in ('session', 'persistent')),
  trigger         text not null,
  evidence        text check (char_length(evidence) <= 200),
  rule            text,
  component       text,
  status          text not null default 'applied' check (status in ('applied', 'reversed', 'expired')),
  reverses        text,
  primary key (user_id, id)
);
create index if not exists adaptation_events_ts_idx on public.adaptation_events (user_id, ts);

-- ---------------------------------------------------------------- memory records with history (spec 7.4, 22.2)
create table if not exists public.memory_records (
  user_id        uuid not null references auth.users(id) on delete cascade,
  id             text not null,
  kind           text not null,
  key            text not null,
  content        text not null check (char_length(content) <= 500),
  source         text not null,
  confidence     text not null check (confidence in ('high', 'medium', 'low')),
  status         text not null check (status in ('active', 'unconfirmed', 'outdated', 'corrected', 'expired', 'deleted')),
  created        timestamptz not null,
  last_confirmed timestamptz,
  expiry         text,
  sessions       text[] not null default '{}',
  history        jsonb not null default '[]',
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------- comprehension checks (spec 11.6)
create table if not exists public.comprehension_checks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id text, message_id text, topic text, question text, choice int, correct boolean not null,
  ts              timestamptz not null default now()
);

-- ---------------------------------------------------------------- account deletion requests (spec 21.1)
create table if not exists public.deletion_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason     text check (char_length(reason) <= 500),
  status     text not null default 'pending' check (status in ('pending', 'done', 'declined')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- research admin access log (spec 21.3 item 5)
create table if not exists public.admin_access_log (
  id       bigint generated always as identity primary key,
  admin_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action   text not null check (char_length(action) <= 60),
  target   text check (char_length(target) <= 120),
  details  jsonb,
  ts       timestamptz not null default now()
);

-- ---------------------------------------------------------------- community organizations (spec 22.7)
create table if not exists public.community_orgs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) <= 160),
  description   text, services text[] not null default '{}', categories text[] not null default '{}',
  population    text, eligibility text, coverage text, languages text[] not null default '{}', cost text,
  application   text, referral text, contact text, website text, apply_url text, evidence text,
  last_verified date, verified_by text, link_status text,
  status        text not null default 'needs_review' check (status in ('active', 'needs_review', 'inactive', 'archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create table if not exists public.resource_matches (
  id       bigint generated always as identity primary key,
  user_id  uuid default auth.uid() references auth.users(id) on delete cascade,
  org_id   uuid references public.community_orgs(id) on delete set null,
  category text,
  ts       timestamptz not null default now()
);

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
create policy profiles_own on public.profiles for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy profiles_research on public.profiles for select to authenticated using (public.is_researcher());

do $$ declare t text; begin
  foreach t in array array['conversations','messages','adaptation_events','memory_records','comprehension_checks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_own', t);
    -- researchers see only participants who gave research consent (spec 17.3, 21.4)
    execute format('create policy %I on public.%I for select to authenticated using (public.is_researcher() and exists (select 1 from public.profiles p where p.user_id = %I.user_id and p.research_consent))', t || '_research', t, t);
  end loop;
end $$;

alter table public.deletion_requests enable row level security;
create policy deletion_own on public.deletion_requests for insert to authenticated with check (user_id = (select auth.uid()));
create policy deletion_read on public.deletion_requests for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

alter table public.admin_access_log enable row level security;
create policy access_log_insert on public.admin_access_log for insert to authenticated with check (public.is_researcher() and admin_id = (select auth.uid()));
create policy access_log_read on public.admin_access_log for select to authenticated using (public.is_researcher());

alter table public.community_orgs enable row level security;
create policy orgs_public_read on public.community_orgs for select to anon, authenticated using (status = 'active');
create policy orgs_research_read on public.community_orgs for select to authenticated using (public.is_researcher());
create policy orgs_research_write on public.community_orgs for insert to authenticated with check (public.is_researcher());
create policy orgs_research_update on public.community_orgs for update to authenticated using (public.is_researcher()) with check (public.is_researcher());
create policy orgs_research_delete on public.community_orgs for delete to authenticated using (public.is_researcher());

alter table public.resource_matches enable row level security;
create policy matches_insert on public.resource_matches for insert to authenticated with check (user_id = (select auth.uid()));
create policy matches_read on public.resource_matches for select to authenticated using (user_id = (select auth.uid()) or public.is_researcher());

-- ---------------------------------------------------------------- withdraw: erase everything a user stored
create or replace function public.delete_my_data() returns void
language plpgsql security invoker set search_path = public as $$
begin
  delete from public.user_state           where user_id = auth.uid();
  delete from public.research_answers     where user_id = auth.uid();
  delete from public.study_responses      where user_id = auth.uid();
  delete from public.clinician_ratings    where user_id = auth.uid();
  delete from public.conversations        where user_id = auth.uid();   -- cascades to messages
  delete from public.adaptation_events    where user_id = auth.uid();
  delete from public.memory_records       where user_id = auth.uid();
  delete from public.comprehension_checks where user_id = auth.uid();
  delete from public.resource_matches     where user_id = auth.uid();
end $$;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
