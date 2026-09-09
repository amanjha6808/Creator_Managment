-- ─── Creator Tags ─────────────────────────────────────────────────────────────
-- Run this AFTER 00002_dashboard_users.sql in your Supabase SQL Editor.

-- ─── Add tags to creators (custom labels like 'priority', 'budget issue') ────

ALTER TABLE creators ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';