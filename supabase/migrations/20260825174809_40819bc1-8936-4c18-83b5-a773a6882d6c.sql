REVOKE ALL ON FUNCTION public.sync_candidate_votes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_candidate_votes() TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;