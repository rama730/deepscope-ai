-- Allow authenticated users to read their own login history
-- This fixes: "permission denied for table login_history"

-- Ensure RLS is enabled (safe if already enabled)
alter table if exists public.login_history enable row level security;

-- Ensure base privileges exist (RLS still enforces row-level access)
grant select on table public.login_history to authenticated;
-- Allow anon to select too so the client doesn't throw "permission denied" during session hydration.
-- RLS still applies, and auth.uid() is null for anon, so it will return 0 rows.
grant select on table public.login_history to anon;

-- Create policy only if it doesn't already exist
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'login_history'
      and policyname = 'login_history_select_own'
  ) then
    create policy "login_history_select_own"
      on public.login_history
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;


