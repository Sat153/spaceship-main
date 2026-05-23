ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS featured_image text;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS source text;
