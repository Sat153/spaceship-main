-- Add verification columns to content_posts
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS verification_status text
  CHECK (verification_status IN ('verified', 'in_review', 'has_errors'));

ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS verification_notes text;
