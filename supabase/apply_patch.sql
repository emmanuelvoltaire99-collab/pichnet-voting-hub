-- Patch idempotent — compatible schéma AI Studio (MISS/MASTER, PENDING/SUCCESS)
-- Ne recrée PAS les types/tables déjà présents

-- 1) votes_count manquant
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS votes_count integer NOT NULL DEFAULT 0;

-- 2) Types app_role si absents
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) user_roles + has_role
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN auth.uid() IS DISTINCT FROM _user_id AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    ) THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role = _role
    )
  END
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 4) Trigger votes → votes_count
CREATE OR REPLACE FUNCTION public.sync_candidate_votes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.candidates c
  SET votes_count = COALESCE((SELECT SUM(v.quantity) FROM public.votes v WHERE v.candidate_id = c.id), 0)
  WHERE c.id = COALESCE(NEW.candidate_id, OLD.candidate_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_candidate_votes ON public.votes;
CREATE TRIGGER trg_sync_candidate_votes
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.sync_candidate_votes();

REVOKE ALL ON FUNCTION public.sync_candidate_votes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_candidate_votes() TO service_role;

-- 5) Seed candidats (enums AI Studio = MISS / MASTER)
INSERT INTO public.candidates (first_name, last_name, candidate_number, category, region, city, biography, is_active)
SELECT * FROM (VALUES
  ('DEMO', 'CANDIDATE MISS 1', 1, 'MISS'::public.candidate_category, 'Centre', 'Yaoundé', 'DEMO — biographie fictive de test.', true),
  ('DEMO', 'CANDIDATE MISS 2', 2, 'MISS'::public.candidate_category, 'Littoral', 'Douala', 'DEMO — biographie fictive de test.', true),
  ('DEMO', 'CANDIDATE MISS 3', 3, 'MISS'::public.candidate_category, 'Ouest', 'Bafoussam', 'DEMO — biographie fictive de test.', true),
  ('BILE', 'MALAKE II', 3, 'MASTER'::public.candidate_category, 'Centre', 'Yaoundé', NULL, true),
  ('ABENA', 'ADANDE', 4, 'MASTER'::public.candidate_category, 'Centre', 'Yaoundé', NULL, true),
  ('KAMGANG', 'CHRISTIAN', 5, 'MASTER'::public.candidate_category, 'Ouest', 'Bafoussam', NULL, true),
  ('ENO BOMO', 'ARTHUR', 6, 'MASTER'::public.candidate_category, 'Sud-Ouest', 'Buea', NULL, true),
  ('MVONDO', 'YANN ARTHUR', 7, 'MASTER'::public.candidate_category, 'Centre', 'Yaoundé', NULL, true),
  ('TONYE', 'PIERRE HENRY', 8, 'MASTER'::public.candidate_category, 'Littoral', 'Douala', NULL, true),
  ('DONGMO ZEBAZE', 'ALIX', 9, 'MASTER'::public.candidate_category, 'Ouest', 'Dschang', NULL, true),
  ('NAMA ETUNDI', 'EMMANUEL', 10, 'MASTER'::public.candidate_category, 'Centre', 'Yaoundé', NULL, true)
) AS v(first_name, last_name, candidate_number, category, region, city, biography, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.candidates LIMIT 1);

-- 6) Bucket photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "candidate photos readable" ON storage.objects;
CREATE POLICY "candidate photos readable" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'candidate-photos');

DROP POLICY IF EXISTS "admins upload candidate photos" ON storage.objects;
CREATE POLICY "admins upload candidate photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins update candidate photos" ON storage.objects;
CREATE POLICY "admins update candidate photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins delete candidate photos" ON storage.objects;
CREATE POLICY "admins delete candidate photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(),'admin'));
