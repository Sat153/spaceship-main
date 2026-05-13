-- ============================================================
-- WORKFLOW STAGES: Phase 1 Foundation
-- ============================================================

-- 1. workflow_stages — 6 fixed stages per client workflow
CREATE TABLE IF NOT EXISTS workflow_stages (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  stage_order   int  NOT NULL,
  description   text,
  client_visible boolean DEFAULT false,
  -- department names that can access this stage (empty = admin only)
  allowed_dept_names text[] DEFAULT ARRAY[]::text[],
  created_at    timestamptz DEFAULT now()
);

-- 2. client_workflows — tracks current stage per client
CREATE TABLE IF NOT EXISTS client_workflows (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        uuid REFERENCES clients(id) ON DELETE CASCADE,
  current_stage_id uuid REFERENCES workflow_stages(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(client_id)
);

-- 3. room_access — which departments can see which chat room
CREATE TABLE IF NOT EXISTS room_access (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id       uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE(room_id, department_id)
);

-- 4. Add stage_id to chat_rooms
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES workflow_stages(id);

-- 5. Add is_internal to chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;

-- ============================================================
-- SEED: 6 workflow stages
-- ============================================================
INSERT INTO workflow_stages (name, stage_order, description, client_visible, allowed_dept_names) VALUES
  ('01 Raw Assets & PR',       1, 'Upload raw photos, videos, press releases',      false, ARRAY['PR & Social Media', 'Creative Labs', 'External Assets']),
  ('02 Creative Production',   2, 'Editing, graphic design, caption creation',       false, ARRAY['PR & Social Media', 'Creative Labs']),
  ('03 Internal Review',       3, 'Internal quality review — admin only',            false, ARRAY[]::text[]),
  ('04 Final Approval',        4, 'Client-side approval stage',                      true,  ARRAY[]::text[]),
  ('05 Content Posting',       5, 'Publishing approved content',                     false, ARRAY['PR & Social Media']),
  ('06 Posted Verification',   6, 'Cross-check live content vs plan',                false, ARRAY['PR & Social Media'])
ON CONFLICT DO NOTHING;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE workflow_stages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_workflows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_access       ENABLE ROW LEVEL SECURITY;

-- workflow_stages: everyone can read, only admin can write
CREATE POLICY "workflow_stages_select" ON workflow_stages FOR SELECT USING (true);
CREATE POLICY "workflow_stages_admin"  ON workflow_stages FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- client_workflows: authenticated can read
CREATE POLICY "client_workflows_select" ON client_workflows FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "client_workflows_admin"  ON client_workflows FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- room_access: authenticated can read, admin can write
CREATE POLICY "room_access_select" ON room_access FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "room_access_admin"  ON room_access FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
