-- Create team-assets storage bucket (public so URLs work without tokens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-assets',
  'team-assets',
  true,
  52428800,  -- 50MB limit
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can read, admins can write
CREATE POLICY IF NOT EXISTS "team-assets-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-assets' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "team-assets-insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'team-assets' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "team-assets-update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'team-assets' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "team-assets-delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'team-assets' AND auth.role() = 'authenticated');
