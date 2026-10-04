-- Versioned autosave: time-spaced recovery points of a project's document.
-- Each row points to a JSON copy stored under projects/{id}/snapshots/{id}.json.

CREATE TABLE public.project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_version integer NOT NULL,
  storage_path text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('autosave', 'manual')),
  label text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);
GRANT SELECT, INSERT, DELETE ON public.project_snapshots TO authenticated;
GRANT ALL ON public.project_snapshots TO service_role;
ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX project_snapshots_project_idx ON public.project_snapshots(project_id, created_at DESC);

CREATE POLICY "Participants read snapshots" ON public.project_snapshots FOR SELECT TO authenticated
USING (public.is_project_owner(project_id) OR public.is_project_member(project_id));
-- Editors create snapshots; autosave pruning also deletes them, so DELETE is
-- allowed for any editor (the explicit "delete recovery point" action is
-- restricted to the owner in the application layer).
CREATE POLICY "Editors create snapshots" ON public.project_snapshots FOR INSERT TO authenticated
WITH CHECK (public.can_edit_project(project_id) AND created_by = auth.uid());
CREATE POLICY "Editors delete snapshots" ON public.project_snapshots FOR DELETE TO authenticated
USING (public.can_edit_project(project_id));

-- Storage: editors may delete objects inside a project's snapshots/ folder so
-- autosave pruning works. The main document.json stays owner-only (handled by
-- the existing "Project owners delete documents" policy); this policy is scoped
-- to the snapshots subfolder only.
CREATE POLICY "Project editors delete snapshots" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'projects'
  AND (storage.foldername(name))[2] = 'snapshots'
  AND public.can_edit_project((storage.foldername(name))[1]::uuid)
);
