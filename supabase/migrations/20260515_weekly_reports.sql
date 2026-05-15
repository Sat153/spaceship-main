-- Weekly reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_text TEXT,
  completed_count INT DEFAULT 0,
  in_progress_count INT DEFAULT 0,
  pending_count INT DEFAULT 0,
  overdue_count INT DEFAULT 0,
  tasks_data JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Employees can read their own reports
CREATE POLICY "users_read_own_reports" ON weekly_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role (admin actions) can insert/update
CREATE POLICY "service_role_all" ON weekly_reports
  FOR ALL USING (auth.role() = 'service_role');
