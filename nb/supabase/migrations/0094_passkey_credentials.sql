-- Passkey (WebAuthn) credentials for step-up verification
create extension if not exists pgcrypto;

create table if not exists public.passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean,
  transports text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists passkey_credentials_user_id_idx on public.passkey_credentials(user_id);

alter table public.passkey_credentials enable row level security;

-- Base privileges (RLS still applies)
grant select, insert, update, delete on table public.passkey_credentials to authenticated;

-- Users can manage their own passkeys
create policy "passkey_credentials_select_own"
  on public.passkey_credentials
  for select
  using (auth.uid() = user_id);

create policy "passkey_credentials_insert_own"
  on public.passkey_credentials
  for insert
  with check (auth.uid() = user_id);

create policy "passkey_credentials_update_own"
  on public.passkey_credentials
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "passkey_credentials_delete_own"
  on public.passkey_credentials
  for delete
  using (auth.uid() = user_id);


