-- Photo board columns on chat_messages
-- Lets teams organise Telegram photos into Raw vs Selected and add captions

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS photo_status text DEFAULT 'raw'
    CHECK (photo_status IN ('raw', 'selected')),
  ADD COLUMN IF NOT EXISTS photo_caption text;
