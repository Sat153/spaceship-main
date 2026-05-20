ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS message_color text,
  ADD COLUMN IF NOT EXISTS asset_category text CHECK (asset_category IN ('sfx', 'music', 'templates', 'color_grades', 'other'));
