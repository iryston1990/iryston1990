CREATE POLICY "Owner publishes news directly" ON public.news
  FOR INSERT TO authenticated
  WITH CHECK (public.is_site_owner(auth.uid()) AND author_id = auth.uid());