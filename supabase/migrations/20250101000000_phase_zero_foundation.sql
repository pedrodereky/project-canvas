CREATE TYPE public.project_role AS ENUM ('editor', 'commenter', 'viewer');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles visible to authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY,
  prefs jsonb NOT NULL DEFAULT '{"emulateNumpad":false,"historyLimit":100}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own preferences" ON public.user_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own preferences" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own preferences" ON public.user_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  document_version integer NOT NULL DEFAULT 1 CHECK (document_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.project_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.project_role NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status public.invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_invites TO authenticated;
GRANT ALL ON public.project_invites TO service_role;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  role public.project_role NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_locks (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  heartbeat_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_locks TO authenticated;
GRANT ALL ON public.project_locks TO service_role;
ALTER TABLE public.project_locks ENABLE ROW LEVEL SECURITY;

CREATE INDEX project_members_user_idx ON public.project_members(user_id);
CREATE INDEX project_invites_email_idx ON public.project_invites(lower(email)) WHERE status = 'pending';
CREATE INDEX share_links_project_idx ON public.share_links(project_id) WHERE revoked_at IS NULL;
CREATE INDEX project_locks_heartbeat_idx ON public.project_locks(heartbeat_at);

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project_id AND user_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_edit_project(_project_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_project_owner(_project_id, _user_id)
    OR EXISTS (SELECT 1 FROM public.project_members WHERE project_id = _project_id AND user_id = _user_id AND role = 'editor')
$$;
GRANT EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid) TO authenticated;

CREATE POLICY "Members can view projects" ON public.projects FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_project_member(id));
CREATE POLICY "Users create owned projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update projects" ON public.projects FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete projects" ON public.projects FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Members view memberships" ON public.project_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_project_owner(project_id));
CREATE POLICY "Owners add members" ON public.project_members FOR INSERT TO authenticated WITH CHECK (public.is_project_owner(project_id));
CREATE POLICY "Owners update members" ON public.project_members FOR UPDATE TO authenticated USING (public.is_project_owner(project_id)) WITH CHECK (public.is_project_owner(project_id));
CREATE POLICY "Owners remove members" ON public.project_members FOR DELETE TO authenticated USING (public.is_project_owner(project_id));

CREATE POLICY "Owners manage invites" ON public.project_invites FOR ALL TO authenticated USING (public.is_project_owner(project_id)) WITH CHECK (public.is_project_owner(project_id) AND created_by = auth.uid());
CREATE POLICY "Owners manage links" ON public.share_links FOR ALL TO authenticated USING (public.is_project_owner(project_id)) WITH CHECK (public.is_project_owner(project_id) AND created_by = auth.uid());

CREATE POLICY "Participants view locks" ON public.project_locks FOR SELECT TO authenticated
USING (public.is_project_owner(project_id) OR public.is_project_member(project_id));
CREATE POLICY "Editors create locks" ON public.project_locks FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_edit_project(project_id));
CREATE POLICY "Lock holders update locks" ON public.project_locks FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.can_edit_project(project_id))
WITH CHECK (user_id = auth.uid() AND public.can_edit_project(project_id));
CREATE POLICY "Lock holders remove locks" ON public.project_locks FOR DELETE TO authenticated
USING (user_id = auth.uid());