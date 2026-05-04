-- ============================================================
-- Migration: Messaging Bank + Content Priority + Asset Version
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Caption & Messaging Bank table
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body_hindi TEXT,
    body_english TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('kisan', 'women', 'development', 'general', 'crisis', 'event')),
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read message_templates"
    ON message_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert message_templates"
    ON message_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update message_templates"
    ON message_templates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete message_templates"
    ON message_templates FOR DELETE TO authenticated USING (true);

-- 2. Add priority to content_posts
ALTER TABLE content_posts
    ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- 3. (Optional) Add version label to assets
ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT NULL;
-- Example values: 'V1', 'V2', 'V3', 'Final'
