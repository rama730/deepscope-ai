-- Create audit_logs table
create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    action text not null,
    ip_address text,
    user_agent text,
    location text,
    meta jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Policy: Users can view their own logs
create policy "Users can view their own audit logs"
    on public.audit_logs for select
    using (auth.uid() = user_id);

-- Policy: Only system or RPC can insert (secured by function)
-- Actually, we can allow insert if user_id matches, but a function is cleaner for enforcing timestamp/id.
-- Let's stick to a function for insertions to ensure integrity, but we'll need basic insert policy if we call from client directly?
-- No, we prefer RPC `log_activity`.

-- Function to log activity
create or replace function public.log_activity(
    action text,
    user_id uuid default auth.uid(),
    ip_address text default null,
    user_agent text default null,
    meta jsonb default '{}'::jsonb
) returns void as $$
begin
    insert into public.audit_logs (user_id, action, ip_address, user_agent, meta)
    values (user_id, action, ip_address, user_agent, meta);
end;
$$ language plpgsql security definer;
-- Security definer needed if we want to log actions even if RLS somehow blocks, 
-- but crucially it allows us to set user_id to auth.uid() reliably or passed user_id (if admin).
-- Defaulting user_id to auth.uid() is good.

-- Grant access
grant select on public.audit_logs to authenticated;
grant execute on function public.log_activity to authenticated;
-- Also grant to anon if we want to log failed login attempts? 
-- For anon failed logins, auth.uid() is null. We might need to allow user_id to be null or store attempted email in meta.
-- Schema says user_id is not null. So failed logins for unknown users can't be stored here easily linked to a user.
-- For now, we focus on user-centric audit logs.
