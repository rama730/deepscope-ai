-- DEFINITIVE RLS FIX
-- Run this in Supabase SQL Editor

-- 1. Ensure column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Reset RLS Policies completely
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts/confusion
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON public.profiles;

-- 3. Create Simple, Broad Policies

-- Allow EVERYONE to READ profiles (needed for username check)
CREATE POLICY "Enable read access for all users" ON public.profiles
    FOR SELECT USING (true);

-- Allow AUTHENTICATED USERS to do ANYTHING (Insert, Update, Delete) to THEIR OWN profile
-- This covers UPSERT, which needs both Insert and Update permissions
CREATE POLICY "Enable all actions for users based on user_id" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- 4. Grant Table Permissions (Crucial for some setups)
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
