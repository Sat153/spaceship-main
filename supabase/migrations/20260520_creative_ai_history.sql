CREATE TABLE IF NOT EXISTS creative_ai_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    category text NOT NULL,
    suggestion text NOT NULL,
    used_by uuid REFERENCES profiles(id),
    used_at timestamptz DEFAULT now()
);

ALTER TABLE creative_ai_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read history" ON creative_ai_history
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert history" ON creative_ai_history
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
