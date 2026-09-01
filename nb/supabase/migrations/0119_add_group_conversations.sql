-- Migration 0119: Add Group Conversations Support
-- Enhances group conversation functionality with member roles and management

-- 1. Verify and add missing columns to conversations table
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS group_name TEXT,
    ADD COLUMN IF NOT EXISTS group_description TEXT,
    ADD COLUMN IF NOT EXISTS group_avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Create conversation_members table for group participants with roles
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_members' 
        AND column_name = 'role'
    ) THEN
        -- Add the column with default value
        ALTER TABLE public.conversation_members 
        ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
        
        -- Add the CHECK constraint separately
        ALTER TABLE public.conversation_members 
        ADD CONSTRAINT conversation_members_role_check 
        CHECK (role IN ('admin', 'member'));
    END IF;
END
$$;

-- 3. Create indexes for conversation_members
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id 
    ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id 
    ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_role 
    ON public.conversation_members(conversation_id, role);

-- 4. Enable RLS for conversation_members
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- 5. Create helper function to check if user is admin (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_group_admin(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
        AND role = 'admin'
    );
END;
$$;

-- 6. Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins and creators can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins and creators can update member roles" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins, creators, and members can remove members" ON public.conversation_members;

-- 7. RLS Policies for conversation_members
-- Users can view members of conversations they're part of
CREATE POLICY "Users can view members of their conversations"
    ON public.conversation_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_members.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can add members if they're admins or the conversation creator
-- OR if they're adding themselves and are already a participant
CREATE POLICY "Admins and creators can add members"
    ON public.conversation_members
    FOR INSERT
    WITH CHECK (
        -- Allow if user is adding themselves and is already a participant
        (conversation_members.user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_members.conversation_id
            AND cp.user_id = auth.uid()
        ))
        OR
        -- Allow if user is admin or creator adding others
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_members.conversation_id
            AND (
                c.created_by = auth.uid()
                OR public.is_group_admin(c.id, auth.uid())
            )
        )
    );

-- Admins and creators can update member roles
CREATE POLICY "Admins and creators can update member roles"
    ON public.conversation_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_members.conversation_id
            AND (
                c.created_by = auth.uid()
                OR public.is_group_admin(c.id, auth.uid())
            )
        )
    );

-- Admins, creators, and the member themselves can remove members
CREATE POLICY "Admins, creators, and members can remove members"
    ON public.conversation_members
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_members.conversation_id
            AND (
                c.created_by = auth.uid()
                OR public.is_group_admin(c.id, auth.uid())
            )
        )
    );

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID, UUID) TO authenticated;
GRANT ALL ON TABLE public.conversation_members TO authenticated;

-- 9. Create function to create a group conversation
CREATE OR REPLACE FUNCTION public.create_group_conversation(
    p_creator_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_initial_member_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conversation_id UUID;
    v_member_id UUID;
BEGIN
    -- Create the conversation
    INSERT INTO public.conversations (
        is_group,
        group_name,
        group_description,
        group_avatar_url,
        created_by,
        type
    )
    VALUES (
        TRUE,
        p_name,
        p_description,
        p_avatar_url,
        p_creator_id,
        'group'
    )
    RETURNING id INTO v_conversation_id;

    -- Add creator as admin in conversation_participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, p_creator_id)
    ON CONFLICT DO NOTHING;

    -- Add creator as admin in conversation_members
    INSERT INTO public.conversation_members (conversation_id, user_id, role, added_by)
    VALUES (v_conversation_id, p_creator_id, 'admin', p_creator_id)
    ON CONFLICT DO NOTHING;

    -- Add initial members
    IF array_length(p_initial_member_ids, 1) > 0 THEN
        FOREACH v_member_id IN ARRAY p_initial_member_ids
        LOOP
            -- Skip creator
            IF v_member_id != p_creator_id THEN
                -- Add to conversation_participants
                INSERT INTO public.conversation_participants (conversation_id, user_id)
                VALUES (v_conversation_id, v_member_id)
                ON CONFLICT DO NOTHING;

                -- Add to conversation_members as regular member
                INSERT INTO public.conversation_members (conversation_id, user_id, role, added_by)
                VALUES (v_conversation_id, v_member_id, 'member', p_creator_id)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    RETURN v_conversation_id;
END;
$$;

-- 10. Create function to add a member to a group
CREATE OR REPLACE FUNCTION public.add_group_member(
    p_conversation_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT 'member',
    p_added_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify the conversation is a group
    IF NOT EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id AND is_group = TRUE
    ) THEN
        RAISE EXCEPTION 'Conversation is not a group';
    END IF;

    -- Verify the user adding has permission (admin or creator)
    IF NOT EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = p_conversation_id
        AND (
            c.created_by = p_added_by
            OR EXISTS (
                SELECT 1 FROM public.conversation_members cm
                WHERE cm.conversation_id = c.id
                AND cm.user_id = p_added_by
                AND cm.role = 'admin'
            )
        )
    ) THEN
        RAISE EXCEPTION 'User does not have permission to add members';
    END IF;

    -- Add to conversation_participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (p_conversation_id, p_user_id)
    ON CONFLICT DO NOTHING;

    -- Add to conversation_members
    INSERT INTO public.conversation_members (conversation_id, user_id, role, added_by)
    VALUES (p_conversation_id, p_user_id, p_role, p_added_by)
    ON CONFLICT (conversation_id, user_id) 
    DO UPDATE SET role = p_role;

    RETURN TRUE;
END;
$$;

-- 11. Create function to remove a member from a group
CREATE OR REPLACE FUNCTION public.remove_group_member(
    p_conversation_id UUID,
    p_user_id UUID,
    p_removed_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify the conversation is a group
    IF NOT EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id AND is_group = TRUE
    ) THEN
        RAISE EXCEPTION 'Conversation is not a group';
    END IF;

    -- Verify the user removing has permission (admin, creator, or removing themselves)
    IF p_user_id != p_removed_by AND NOT EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = p_conversation_id
        AND (
            c.created_by = p_removed_by
            OR EXISTS (
                SELECT 1 FROM public.conversation_members cm
                WHERE cm.conversation_id = c.id
                AND cm.user_id = p_removed_by
                AND cm.role = 'admin'
            )
        )
    ) THEN
        RAISE EXCEPTION 'User does not have permission to remove members';
    END IF;

    -- Remove from conversation_members
    DELETE FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

    -- Remove from conversation_participants
    DELETE FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

    RETURN TRUE;
END;
$$;

-- 12. Create function to update group settings
CREATE OR REPLACE FUNCTION public.update_group_settings(
    p_conversation_id UUID,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_updated_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify the conversation is a group
    IF NOT EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id AND is_group = TRUE
    ) THEN
        RAISE EXCEPTION 'Conversation is not a group';
    END IF;

    -- Verify the user has permission (admin or creator)
    IF NOT EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = p_conversation_id
        AND (
            c.created_by = p_updated_by
            OR EXISTS (
                SELECT 1 FROM public.conversation_members cm
                WHERE cm.conversation_id = c.id
                AND cm.user_id = p_updated_by
                AND cm.role = 'admin'
            )
        )
    ) THEN
        RAISE EXCEPTION 'User does not have permission to update group settings';
    END IF;

    -- Update group settings
    UPDATE public.conversations
    SET
        group_name = COALESCE(p_name, group_name),
        group_description = COALESCE(p_description, group_description),
        group_avatar_url = COALESCE(p_avatar_url, group_avatar_url),
        updated_at = NOW()
    WHERE id = p_conversation_id;

    RETURN TRUE;
END;
$$;

-- 13. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_group_conversation(UUID, TEXT, TEXT, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_group_member(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_group_settings(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- 14. Enable real-time for conversation_members
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversation_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
    END IF;
END
$$;

-- 15. Set REPLICA IDENTITY FULL for DELETE events
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;

-- 16. Add comments
COMMENT ON FUNCTION public.is_group_admin IS 'Helper function to check if a user is an admin of a group conversation (bypasses RLS to avoid recursion)';
COMMENT ON TABLE public.conversation_members IS 'Group conversation members with roles (admin, member)';
COMMENT ON FUNCTION public.create_group_conversation IS 'Creates a group conversation with initial members';
COMMENT ON FUNCTION public.add_group_member IS 'Adds a member to a group conversation';
COMMENT ON FUNCTION public.remove_group_member IS 'Removes a member from a group conversation';
COMMENT ON FUNCTION public.update_group_settings IS 'Updates group conversation settings (name, description, avatar)';
