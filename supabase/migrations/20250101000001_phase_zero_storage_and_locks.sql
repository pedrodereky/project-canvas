CREATE POLICY "Project participants read documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'projects' AND (public.is_project_owner((storage.foldername(name))[1]::uuid) OR public.is_project_member((storage.foldername(name))[1]::uuid)));
CREATE POLICY "Project editors create documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'projects' AND public.can_edit_project((storage.foldername(name))[1]::uuid));
CREATE POLICY "Project editors update documents" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'projects' AND public.can_edit_project((storage.foldername(name))[1]::uuid))
WITH CHECK (bucket_id = 'projects' AND public.can_edit_project((storage.foldername(name))[1]::uuid));
CREATE POLICY "Project owners delete documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'projects' AND public.is_project_owner((storage.foldername(name))[1]::uuid));

CREATE OR REPLACE FUNCTION public.acquire_project_lock(_project_id uuid, _session_id uuid, _takeover boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_lock public.project_locks%ROWTYPE;
DECLARE holder_name text;
BEGIN
  IF NOT public.can_edit_project(_project_id, auth.uid()) THEN
    RETURN jsonb_build_object('status', 'readonly');
  END IF;
  SELECT * INTO current_lock FROM public.project_locks WHERE project_id = _project_id FOR UPDATE;
  IF NOT FOUND OR current_lock.heartbeat_at < now() - interval '90 seconds' THEN
    INSERT INTO public.project_locks(project_id, user_id, session_id, heartbeat_at)
    VALUES (_project_id, auth.uid(), _session_id, now())
    ON CONFLICT (project_id) DO UPDATE SET user_id = EXCLUDED.user_id, session_id = EXCLUDED.session_id, heartbeat_at = now();
    RETURN jsonb_build_object('status', 'acquired');
  END IF;
  IF current_lock.session_id = _session_id AND current_lock.user_id = auth.uid() THEN
    UPDATE public.project_locks SET heartbeat_at = now() WHERE project_id = _project_id;
    RETURN jsonb_build_object('status', 'acquired');
  END IF;
  IF _takeover AND current_lock.user_id = auth.uid() THEN
    UPDATE public.project_locks SET session_id = _session_id, heartbeat_at = now() WHERE project_id = _project_id;
    RETURN jsonb_build_object('status', 'acquired');
  END IF;
  SELECT nome INTO holder_name FROM public.profiles WHERE id = current_lock.user_id;
  RETURN jsonb_build_object('status', CASE WHEN current_lock.user_id = auth.uid() THEN 'own-other-session' ELSE 'locked' END, 'holderName', coalesce(holder_name, 'Outro usuário'));
END $$;
GRANT EXECUTE ON FUNCTION public.acquire_project_lock(uuid, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.heartbeat_project_lock(_project_id uuid, _session_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed integer;
BEGIN
  UPDATE public.project_locks SET heartbeat_at = now()
  WHERE project_id = _project_id AND user_id = auth.uid() AND session_id = _session_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END $$;
GRANT EXECUTE ON FUNCTION public.heartbeat_project_lock(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_project_lock(_project_id uuid, _session_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.project_locks WHERE project_id = _project_id AND user_id = auth.uid() AND session_id = _session_id
$$;
GRANT EXECUTE ON FUNCTION public.release_project_lock(uuid, uuid) TO authenticated;