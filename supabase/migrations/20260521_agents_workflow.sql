-- Agent workflow system
CREATE TABLE IF NOT EXISTS workflow_agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('parent', 'sub')),
    parent_id uuid REFERENCES workflow_agents(id) ON DELETE SET NULL,
    description text,
    icon text,
    color text DEFAULT '#8b5cf6',
    display_order int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE workflow_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read agents" ON workflow_agents FOR SELECT USING (true);
CREATE POLICY "Admin can manage agents" ON workflow_agents FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS agent_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES workflow_agents(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('urgent', 'pending', 'approved')),
    assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    due_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tasks" ON agent_tasks FOR SELECT USING (true);
CREATE POLICY "Admin can manage tasks" ON agent_tasks FOR ALL USING (true);

-- Seed parent agent
INSERT INTO workflow_agents (id, name, type, description, icon, color, display_order)
VALUES ('00000000-0000-0000-0000-000000000a01', 'Anya Segan', 'parent',
        'Main controlling agent — oversees all sub-agent workflows', 'crown', '#8b5cf6', 0)
ON CONFLICT (id) DO NOTHING;

-- Seed sub agents
INSERT INTO workflow_agents (name, type, parent_id, description, icon, color, display_order)
SELECT * FROM (VALUES
    ('Social Media Agent',         'sub', '00000000-0000-0000-0000-000000000a01'::uuid,
     'Manages social media workflow: photos, captions, reels, vlogs, post publishing', 'share2', '#06b6d4', 1),
    ('DTPR Official Agent',        'sub', '00000000-0000-0000-0000-000000000a01'::uuid,
     'Official PR coordination, government/media communication, approval handling',    'building2', '#f59e0b', 2),
    ('Pushkar Singh Dhami Agent',  'sub', '00000000-0000-0000-0000-000000000a01'::uuid,
     'Dedicated workflow for Pushkar Singh Dhami content and approvals',               'user-check', '#ec4899', 3),
    ('Reverify Agent',             'sub', '00000000-0000-0000-0000-000000000a01'::uuid,
     'Final verification — recheck content before publishing, detect mistakes',        'shield-check', '#22c55e', 4)
) AS v(name, type, parent_id, description, icon, color, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_agents WHERE name = v.name
);
