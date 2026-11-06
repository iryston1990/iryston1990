-- Profiles: one row per account, owner flag set only by the system
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

-- Owner check used by policies (owner must have confirmed email)
CREATE OR REPLACE FUNCTION public.is_site_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = _user_id AND p.is_owner = true AND u.email_confirmed_at IS NOT NULL
  )
$$;

-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, is_owner)
  VALUES (NEW.id, lower(NEW.email) = 'iryston1990@gmail.com')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- News
CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  author_id uuid DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.news TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads approved news" ON public.news
  FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Owner reads all news" ON public.news
  FOR SELECT TO authenticated USING (public.is_site_owner(auth.uid()));
CREATE POLICY "Authors read own news" ON public.news
  FOR SELECT TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Visitors submit pending news" ON public.news
  FOR INSERT TO anon WITH CHECK (status = 'pending' AND author_id IS NULL);
CREATE POLICY "Users submit pending news" ON public.news
  FOR INSERT TO authenticated WITH CHECK (status = 'pending' AND author_id = auth.uid());

CREATE POLICY "Owner approves news" ON public.news
  FOR UPDATE TO authenticated
  USING (public.is_site_owner(auth.uid()))
  WITH CHECK (public.is_site_owner(auth.uid()));

CREATE POLICY "Owner or author deletes news" ON public.news
  FOR DELETE TO authenticated
  USING (public.is_site_owner(auth.uid()) OR author_id = auth.uid());

CREATE INDEX news_status_created_idx ON public.news (status, created_at DESC);