-- ============================================================================
-- Restringe quem executa as funções SECURITY DEFINER
-- ============================================================================
-- No Postgres, toda função nasce com EXECUTE para PUBLIC. As migrations da
-- Fase 0 davam GRANT para authenticated sem revogar de PUBLIC, então o papel
-- anon também podia chamá-las por /rest/v1/rpc. As três de permissão aceitam
-- um _user_id arbitrário: um visitante conseguia perguntar se a pessoa X é
-- dona ou membro do projeto Y.
--
-- O app só as chama logado (server functions com a sessão do usuário) e
-- dentro das policies de RLS, que rodam como authenticated. Idempotente.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid, uuid)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.acquire_project_lock(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.heartbeat_project_lock(uuid, uuid)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_project_lock(uuid, uuid)          FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid)             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acquire_project_lock(uuid, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_project_lock(uuid, uuid)        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_project_lock(uuid, uuid)          TO authenticated, service_role;
