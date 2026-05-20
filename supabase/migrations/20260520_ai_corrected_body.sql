ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS ai_corrected_body text;
