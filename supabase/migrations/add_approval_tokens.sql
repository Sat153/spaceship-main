-- Approval tokens for Akhilesh Ji one-click approval flow
CREATE TABLE IF NOT EXISTS approval_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  token       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at     TIMESTAMPTZ,
  action_taken TEXT CHECK (action_taken IN ('approved', 'rejected')),
  rejection_note TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS approval_tokens_token_idx ON approval_tokens(token);
CREATE INDEX IF NOT EXISTS approval_tokens_post_id_idx ON approval_tokens(post_id);

-- Allow public read/write on this table (token is the secret)
ALTER TABLE approval_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read token by value"
  ON approval_tokens FOR SELECT
  USING (true);

CREATE POLICY "Service role full access"
  ON approval_tokens FOR ALL
  USING (true)
  WITH CHECK (true);
