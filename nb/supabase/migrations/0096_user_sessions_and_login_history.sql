-- Ensure session and login-history tables exist and are readable by the app
create extension if not exists pgcrypto;

-- LOGIN HISTORY (some environments already have this table; keep changes additive)
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  location text,
  suspicious boolean not null default false,
  success boolean not null default true,
  failure_reason text
);

-- Add missing columns if table pre-existed with a different shape
alter table public.login_history add column if not exists user_id uuid;
alter table public.login_history add column if not exists created_at timestamptz;
alter table public.login_history add column if not exists ip_address text;
alter table public.login_history add column if not exists user_agent text;
alter table public.login_history add column if not exists location text;
alter table public.login_history add column if not exists suspicious boolean;
alter table public.login_history add column if not exists success boolean;
alter table public.login_history add column if not exists failure_reason text;

-- Ensure defaults where possible (safe if column already has defaults)
alter table public.login_history alter column created_at set default now();
alter table public.login_history alter column suspicious set default false;
alter table public.login_history alter column success set default true;

create index if not exists login_history_user_id_created_at_idx on public.login_history(user_id, created_at desc);

alter table public.login_history enable row level security;
grant select on table public.login_history to authenticated;
grant select on table public.login_history to anon;
grant insert on table public.login_history to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='login_history' and policyname='login_history_select_own'
  ) then
    create policy "login_history_select_own"
      on public.login_history
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

-- USER SESSIONS (active devices list)
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  device_info jsonb not null default '{}'::jsonb,
  ip_address text,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- If the table existed previously with a different schema, add missing columns
alter table public.user_sessions add column if not exists user_id uuid;
alter table public.user_sessions add column if not exists device_hash text;
alter table public.user_sessions add column if not exists device_info jsonb;
alter table public.user_sessions add column if not exists ip_address text;
alter table public.user_sessions add column if not exists last_active timestamptz;
alter table public.user_sessions add column if not exists created_at timestamptz;

-- Ensure defaults
alter table public.user_sessions alter column device_info set default '{}'::jsonb;
alter table public.user_sessions alter column last_active set default now();
alter table public.user_sessions alter column created_at set default now();

-- Backfill device_hash for existing rows (safe/no-op if already populated)
update public.user_sessions
set device_hash = left(encode(digest(coalesce(device_info->>'userAgent','unknown'), 'sha256'), 'hex'), 32)
where device_hash is null or device_hash = '';

-- Enforce NOT NULL after backfill (may fail only if you have rows with NULL user_id)
alter table public.user_sessions alter column device_hash set not null;

drop index if exists user_sessions_user_device_hash_uniq;
create unique index if not exists user_sessions_user_device_hash_uniq on public.user_sessions(user_id, device_hash);
create index if not exists user_sessions_user_last_active_idx on public.user_sessions(user_id, last_active desc);

alter table public.user_sessions enable row level security;
grant select on table public.user_sessions to authenticated;
grant select on table public.user_sessions to anon;
grant insert, update, delete on table public.user_sessions to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_sessions' and policyname='user_sessions_select_own'
  ) then
    create policy "user_sessions_select_own"
      on public.user_sessions
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_sessions' and policyname='user_sessions_modify_own'
  ) then
    create policy "user_sessions_modify_own"
      on public.user_sessions
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;


