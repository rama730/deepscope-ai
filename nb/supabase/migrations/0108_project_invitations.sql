-- ==============================================================================
-- MIGRATION 0108: PROJECT INVITATIONS (ACCEPT/DECLINE FLOW)
-- ==============================================================================

-- 1) PROJECT INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.project_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Basic constraints for safety
ALTER TABLE public.project_invitations
    ADD CONSTRAINT project_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));

ALTER TABLE public.project_invitations
    ADD CONSTRAINT project_invitations_role_check
    CHECK (role IN ('admin', 'member', 'viewer'));

-- Prevent duplicate pending invites per project/invitee
CREATE UNIQUE INDEX IF NOT EXISTS uniq_project_invitations_pending
ON public.project_invitations (project_id, invitee_id)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_project_invitations_invitee
ON public.project_invitations (invitee_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_invitations_project
ON public.project_invitations (project_id, status, created_at DESC);

-- 2) UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.set_project_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_invitations_updated_at ON public.project_invitations;
CREATE TRIGGER trg_project_invitations_updated_at
  BEFORE UPDATE ON public.project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_invitations_updated_at();

-- 3) RLS POLICIES
DROP POLICY IF EXISTS "Invitee can view own project invitations" ON public.project_invitations;
CREATE POLICY "Invitee can view own project invitations" ON public.project_invitations
  FOR SELECT
  USING (invitee_id = auth.uid());

DROP POLICY IF EXISTS "Inviter can view sent project invitations" ON public.project_invitations;
CREATE POLICY "Inviter can view sent project invitations" ON public.project_invitations
  FOR SELECT
  USING (inviter_id = auth.uid());

DROP POLICY IF EXISTS "Project creator can view invitations" ON public.project_invitations;
CREATE POLICY "Project creator can view invitations" ON public.project_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_invitations.project_id
        AND p.creator_id = auth.uid()
    )
  );

-- Insert: inviter must be creator or admin collaborator
DROP POLICY IF EXISTS "Creators and admins can invite to projects" ON public.project_invitations;
CREATE POLICY "Creators and admins can invite to projects" ON public.project_invitations
  FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_invitations.project_id
          AND p.creator_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_collaborators pc
        WHERE pc.project_id = project_invitations.project_id
          AND pc.user_id = auth.uid()
          AND pc.role IN ('owner', 'admin')
      )
    )
  );

-- Update: invitee can accept/decline pending invites
DROP POLICY IF EXISTS "Invitee can respond to invitations" ON public.project_invitations;
CREATE POLICY "Invitee can respond to invitations" ON public.project_invitations
  FOR UPDATE
  USING (invitee_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    invitee_id = auth.uid()
    AND status IN ('accepted', 'declined')
  );

-- Update: inviter (or project creator) can cancel pending invites
DROP POLICY IF EXISTS "Inviter can cancel invitations" ON public.project_invitations;
CREATE POLICY "Inviter can cancel invitations" ON public.project_invitations
  FOR UPDATE
  USING (inviter_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');

DROP POLICY IF EXISTS "Project creator can cancel invitations" ON public.project_invitations;
CREATE POLICY "Project creator can cancel invitations" ON public.project_invitations
  FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_invitations.project_id
        AND p.creator_id = auth.uid()
    )
  )
  WITH CHECK (status = 'cancelled');

-- 4) NOTIFICATIONS: create project_invite notification when invitation is created
CREATE OR REPLACE FUNCTION public.handle_new_project_invitation()
RETURNS TRIGGER AS $$
DECLARE
  project_title TEXT;
BEGIN
  SELECT title INTO project_title FROM public.projects WHERE id = NEW.project_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    actor_id,
    related_entity_type,
    related_entity_id,
    created_at
  ) VALUES (
    NEW.invitee_id,
    'project_invite',
    'Project Invitation',
    'invited you to join ' || COALESCE(project_title, 'a project'),
    '/people?tab=inbox',
    NEW.inviter_id,
    'project',
    NEW.project_id,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_project_invitation ON public.project_invitations;
CREATE TRIGGER on_new_project_invitation
  AFTER INSERT ON public.project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project_invitation();

-- 5) ACCEPT INVITE: security-definer helper to add collaborator safely
CREATE OR REPLACE FUNCTION public.accept_project_invitation(p_invitation_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_invitee_id UUID;
  v_role TEXT;
  v_status TEXT;
BEGIN
  SELECT project_id, invitee_id, role, status
  INTO v_project_id, v_invitee_id, v_role, v_status
  FROM public.project_invitations
  WHERE id = p_invitation_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invitee_id IS NULL OR v_invitee_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: only the invitee can accept this invitation';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Invitation is not pending';
  END IF;

  -- Mark invitation accepted
  UPDATE public.project_invitations
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_invitation_id
    AND status = 'pending';

  -- Add collaborator (bypasses RLS via security definer)
  INSERT INTO public.project_collaborators (project_id, user_id, role)
  VALUES (v_project_id, v_invitee_id, v_role)
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN true;
END;
$$;

-- 6) DECLINE INVITE: helper for consistent responded_at
CREATE OR REPLACE FUNCTION public.decline_project_invitation(p_invitation_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitee_id UUID;
  v_status TEXT;
BEGIN
  SELECT invitee_id, status INTO v_invitee_id, v_status
  FROM public.project_invitations
  WHERE id = p_invitation_id;

  IF v_invitee_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invitee_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: only the invitee can decline this invitation';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Invitation is not pending';
  END IF;

  UPDATE public.project_invitations
  SET status = 'declined', responded_at = NOW()
  WHERE id = p_invitation_id
    AND status = 'pending';

  RETURN true;
END;
$$;

-- 7) COLLABORATOR NOTIFICATIONS: avoid mislabeling join as an "invite"
-- Replace handle_new_collaborator to use a non-invite type and (optionally) skip when invite flow is used.
CREATE OR REPLACE FUNCTION public.handle_new_collaborator()
RETURNS TRIGGER AS $$
DECLARE
  project_title TEXT;
  project_creator_id UUID;
  hasAcceptedInvite BOOLEAN;
BEGIN
  -- If this collaborator was added via the invitation-accept flow, skip extra notification
  SELECT EXISTS (
    SELECT 1
    FROM public.project_invitations pi
    WHERE pi.project_id = NEW.project_id
      AND pi.invitee_id = NEW.user_id
      AND pi.status = 'accepted'
  ) INTO hasAcceptedInvite;

  IF hasAcceptedInvite THEN
    RETURN NEW;
  END IF;

  SELECT title, creator_id INTO project_title, project_creator_id
  FROM public.projects
  WHERE id = NEW.project_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    actor_id,
    related_entity_type,
    related_entity_id,
    created_at
  ) VALUES (
    NEW.user_id,
    'project_access_granted',
    'Project Access Granted',
    'You now have access to ' || COALESCE(project_title, 'a project'),
    '/projects/' || NEW.project_id,
    project_creator_id,
    'project',
    NEW.project_id,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_collaborator ON public.project_collaborators;
CREATE TRIGGER on_new_collaborator
  AFTER INSERT ON public.project_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_collaborator();


