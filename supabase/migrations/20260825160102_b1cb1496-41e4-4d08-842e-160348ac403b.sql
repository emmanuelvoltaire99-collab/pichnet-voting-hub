CREATE POLICY "candidate photos readable" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'candidate-photos');
CREATE POLICY "admins upload candidate photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update candidate photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete candidate photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(),'admin'));
