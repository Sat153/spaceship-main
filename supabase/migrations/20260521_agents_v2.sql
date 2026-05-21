-- Update agent names to new structure
UPDATE workflow_agents SET
  name        = 'Social Media Analyst',
  description = 'Analyses and plans content for Facebook (UttarakhandDIPR) — selects photos, writes captions, plans posts, reels and vlogs',
  icon        = 'share2',
  color       = '#1877f2'
WHERE name = 'Social Media Agent';

UPDATE workflow_agents SET
  name        = 'Official Accounts',
  description = 'Manages workflows for DIPR Official (social media), BJP UK, and Pushkar Singh Dhami official accounts',
  icon        = 'building2',
  color       = '#f59e0b'
WHERE name = 'DTPR Official Agent';

-- Remove old Pushkar agent (now consolidated into Official Accounts)
DELETE FROM workflow_agents WHERE name = 'Pushkar Singh Dhami Agent';

UPDATE workflow_agents SET
  name        = 'Verification Agent',
  description = 'Verifies all content for spelling and punctuation before publishing — Green=Verified, Orange=In Review, Red=Has Errors',
  icon        = 'shield-check',
  color       = '#22c55e'
WHERE name = 'Reverify Agent';

-- Add social media specific columns to agent_tasks
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS content_type text
  CHECK (content_type IN ('post', 'reel', 'vlog'));

ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS photo_notes text;
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS caption     text;
