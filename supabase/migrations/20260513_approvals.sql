CREATE TABLE IF NOT EXISTS approvals (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     uuid REFERENCES clients(id) ON DELETE CASCADE,
  stage_id      uuid REFERENCES workflow_stages(id),
  submitted_by  uuid REFERENCES profiles(id),
  reviewed_by   uuid REFERENCES profiles(id),
  status        text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested')),
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select" ON approvals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "approvals_insert" ON approvals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "approvals_update" ON approvals FOR UPDATE USING (auth.uid() IS NOT NULL);
