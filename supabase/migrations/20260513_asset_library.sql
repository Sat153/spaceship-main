-- Create team-assets storage bucket (public so URLs work without tokens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-assets',
  'team-assets',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'team-assets-read' AND tablename = 'objects') THEN
    CREATE POLICY "team-assets-read" ON storage.objects FOR SELECT USING (bucket_id = 'team-assets' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'team-assets-insert' AND tablename = 'objects') THEN
    CREATE POLICY "team-assets-insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'team-assets' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'team-assets-update' AND tablename = 'objects') THEN
    CREATE POLICY "team-assets-update" ON storage.objects FOR UPDATE USING (bucket_id = 'team-assets' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'team-assets-delete' AND tablename = 'objects') THEN
    CREATE POLICY "team-assets-delete" ON storage.objects FOR DELETE USING (bucket_id = 'team-assets' AND auth.role() = 'authenticated');
  END IF;
END $$;
