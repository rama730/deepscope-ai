-- ==============================================================================
-- MIGRATION 0001: AUTHENTICATION & PROFILES
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    headline TEXT,
    website TEXT,
    location TEXT,
    phone TEXT,
    availability_status TEXT,
    open_to TEXT[],
    profile_strength INTEGER DEFAULT 0,
    custom_url TEXT UNIQUE,
    cover_image_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    notification_preferences JSONB DEFAULT '{"email": true, "projects": true, "followers": true, "endorsements": true, "messages": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. PROFILE DETAILS TABLES

-- Skills
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    endorsement_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    proficiency_level TEXT, -- Beginner, Intermediate, Advanced, Expert
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Users manage own skills" ON public.skills FOR ALL USING (auth.uid() = user_id);

-- Skill Endorsements
CREATE TABLE public.skill_endorsements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    endorser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(skill_id, endorser_id)
);
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public endorsements" ON public.skill_endorsements FOR SELECT USING (true);
CREATE POLICY "Users can endorse" ON public.skill_endorsements FOR INSERT WITH CHECK (auth.uid() = endorser_id);
CREATE POLICY "Users can remove endorsement" ON public.skill_endorsements FOR DELETE USING (auth.uid() = endorser_id);

-- Experiences
CREATE TABLE public.experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    current BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public experiences" ON public.experiences FOR SELECT USING (true);
CREATE POLICY "Users manage own experiences" ON public.experiences FOR ALL USING (auth.uid() = user_id);

-- Education
CREATE TABLE public.education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    school TEXT NOT NULL,
    degree TEXT,
    field_of_study TEXT,
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public education" ON public.education FOR SELECT USING (true);
CREATE POLICY "Users manage own education" ON public.education FOR ALL USING (auth.uid() = user_id);

-- Certifications
CREATE TABLE public.certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuer TEXT,
    issue_date DATE,
    expiration_date DATE,
    credential_id TEXT,
    credential_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public certifications" ON public.certifications FOR SELECT USING (true);
CREATE POLICY "Users manage own certifications" ON public.certifications FOR ALL USING (auth.uid() = user_id);

-- Achievements
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    issuer TEXT,
    date_received DATE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Users manage own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);

-- Languages
CREATE TABLE public.user_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    proficiency TEXT, -- Native, Fluent, Conversational, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public languages" ON public.user_languages FOR SELECT USING (true);
CREATE POLICY "Users manage own languages" ON public.user_languages FOR ALL USING (auth.uid() = user_id);

-- Volunteering
CREATE TABLE public.volunteering (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization TEXT NOT NULL,
    role TEXT,
    start_date DATE,
    end_date DATE,
    current BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.volunteering ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public volunteering" ON public.volunteering FOR SELECT USING (true);
CREATE POLICY "Users manage own volunteering" ON public.volunteering FOR ALL USING (auth.uid() = user_id);

-- Publications
CREATE TABLE public.publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    publisher TEXT,
    publication_date DATE,
    url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public publications" ON public.publications FOR SELECT USING (true);
CREATE POLICY "Users manage own publications" ON public.publications FOR ALL USING (auth.uid() = user_id);

-- Social Links
CREATE TABLE public.social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- linkedin, github, twitter, etc.
    url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public social links" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "Users manage own social links" ON public.social_links FOR ALL USING (auth.uid() = user_id);

-- Featured Items
CREATE TABLE public.featured_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT,
    external_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public featured items" ON public.featured_items FOR SELECT USING (true);
CREATE POLICY "Users manage own featured items" ON public.featured_items FOR ALL USING (auth.uid() = user_id);

-- Recommendations
CREATE TABLE public.recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public accepted recommendations" ON public.recommendations FOR SELECT USING (status = 'accepted');
CREATE POLICY "Users read own recommendations" ON public.recommendations FOR SELECT USING (auth.uid() = author_id OR auth.uid() = recipient_id);
CREATE POLICY "Users create recommendations" ON public.recommendations FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own recommendations" ON public.recommendations FOR UPDATE USING (auth.uid() = author_id OR auth.uid() = recipient_id);

-- 4. FUNCTIONS & TRIGGERS

-- Profile Strength Calculation
CREATE OR REPLACE FUNCTION public.calculate_profile_strength(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    profile_record RECORD;
    has_skills BOOLEAN;
    has_experience BOOLEAN;
    has_education BOOLEAN;
    has_social BOOLEAN;
BEGIN
    -- Get profile data
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Basic Info (40 points)
    IF profile_record.full_name IS NOT NULL AND length(profile_record.full_name) > 0 THEN score := score + 10; END IF;
    IF profile_record.headline IS NOT NULL AND length(profile_record.headline) > 0 THEN score := score + 10; END IF;
    IF profile_record.bio IS NOT NULL AND length(profile_record.bio) > 0 THEN score := score + 10; END IF;
    IF profile_record.avatar_url IS NOT NULL AND length(profile_record.avatar_url) > 0 THEN score := score + 10; END IF;

    -- Details (20 points)
    IF profile_record.location IS NOT NULL AND length(profile_record.location) > 0 THEN score := score + 5; END IF;
    IF profile_record.website IS NOT NULL AND length(profile_record.website) > 0 THEN score := score + 5; END IF;
    IF profile_record.open_to IS NOT NULL AND array_length(profile_record.open_to, 1) > 0 THEN score := score + 5; END IF;
    IF profile_record.custom_url IS NOT NULL THEN score := score + 5; END IF;

    -- Related Data (40 points)
    SELECT EXISTS(SELECT 1 FROM public.skills WHERE user_id = user_id_param) INTO has_skills;
    IF has_skills THEN score := score + 10; END IF;

    SELECT EXISTS(SELECT 1 FROM public.experiences WHERE user_id = user_id_param) INTO has_experience;
    IF has_experience THEN score := score + 10; END IF;

    SELECT EXISTS(SELECT 1 FROM public.education WHERE user_id = user_id_param) INTO has_education;
    IF has_education THEN score := score + 10; END IF;

    SELECT EXISTS(SELECT 1 FROM public.social_links WHERE user_id = user_id_param) INTO has_social;
    IF has_social THEN score := score + 10; END IF;

    -- Update the profile with the new score
    UPDATE public.profiles SET profile_strength = score WHERE id = user_id_param;

    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle New User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, username)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'username'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
