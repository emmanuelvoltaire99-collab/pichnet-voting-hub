CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.candidate_category AS ENUM ('miss','master');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','cancelled');

CREATE TABLE public.user_roles (
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
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  candidate_number integer NOT NULL,
  category public.candidate_category NOT NULL,
  region text,
  city text,
  biography text,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  votes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, candidate_number)
);
GRANT SELECT ON public.candidates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads active candidates" ON public.candidates FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update candidates" ON public.candidates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete candidates" ON public.candidates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.vote_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vote_quantity integer NOT NULL CHECK (vote_quantity > 0),
  price integer NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vote_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vote_packages TO authenticated;
GRANT ALL ON public.vote_packages TO service_role;
ALTER TABLE public.vote_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads active packages" ON public.vote_packages FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert packages" ON public.vote_packages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update packages" ON public.vote_packages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete packages" ON public.vote_packages FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.vote_packages(id) ON DELETE RESTRICT,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  payment_method text,
  transaction_reference text UNIQUE,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read all payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.votes TO anon, authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes are publicly readable" ON public.votes FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_candidate_votes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.candidates c
  SET votes_count = COALESCE((SELECT SUM(v.quantity) FROM public.votes v WHERE v.candidate_id = c.id), 0)
  WHERE c.id = COALESCE(NEW.candidate_id, OLD.candidate_id);
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_candidate_votes
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.sync_candidate_votes();

INSERT INTO public.vote_packages (name, vote_quantity, price, currency) VALUES
  ('1 vote', 1, 100, 'XAF'),
  ('5 votes', 5, 500, 'XAF'),
  ('10 votes', 10, 1000, 'XAF'),
  ('25 votes', 25, 2500, 'XAF'),
  ('50 votes', 50, 5000, 'XAF');

INSERT INTO public.candidates (first_name, last_name, candidate_number, category, region, city, biography, is_active) VALUES
  ('DEMO', 'CANDIDATE MISS 1', 1, 'miss', 'Centre', 'Yaoundé', 'DEMO — biographie fictive de test.', true),
  ('DEMO', 'CANDIDATE MISS 2', 2, 'miss', 'Littoral', 'Douala', 'DEMO — biographie fictive de test.', true),
  ('DEMO', 'CANDIDATE MISS 3', 3, 'miss', 'Ouest', 'Bafoussam', 'DEMO — biographie fictive de test.', true),
  ('BILE', 'MALAKE II', 3, 'master', 'Centre', 'Yaoundé', NULL, true),
  ('ABENA', 'ADANDE', 4, 'master', 'Centre', 'Yaoundé', NULL, true),
  ('KAMGANG', 'CHRISTIAN', 5, 'master', 'Ouest', 'Bafoussam', NULL, true),
  ('ENO BOMO', 'ARTHUR', 6, 'master', 'Sud-Ouest', 'Buea', NULL, true),
  ('MVONDO', 'YANN ARTHUR', 7, 'master', 'Centre', 'Yaoundé', NULL, true),
  ('TONYE', 'PIERRE HENRY', 8, 'master', 'Littoral', 'Douala', NULL, true),
  ('DONGMO ZEBAZE', 'ALIX', 9, 'master', 'Ouest', 'Dschang', NULL, true),
  ('NAMA ETUNDI', 'EMMANUEL', 10, 'master', 'Centre', 'Yaoundé', NULL, true);
