REVOKE ALL ON FUNCTION public.sync_candidate_votes() FROM PUBLIC, anon, authenticated;

DROP POLICY "public reads active candidates" ON public.candidates;
CREATE POLICY "anon reads active candidates" ON public.candidates FOR SELECT TO anon USING (is_active);
CREATE POLICY "users read candidates" ON public.candidates FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));

DROP POLICY "public reads active packages" ON public.vote_packages;
CREATE POLICY "anon reads active packages" ON public.vote_packages FOR SELECT TO anon USING (is_active);
CREATE POLICY "users read packages" ON public.vote_packages FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
