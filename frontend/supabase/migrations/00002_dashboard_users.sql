-- ─── Dashboard Users & Login ID scoping ──────────────────────────────────────
-- Run this AFTER 00001_initial_schema.sql in your Supabase SQL Editor.

-- ─── Dashboard Users table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dashboard_users (
  login_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dashboard_users DISABLE ROW LEVEL SECURITY;

-- ─── Add login_id to campaigns ──────────────────────────────────────────────

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS login_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_campaigns_login_id ON campaigns(login_id);

-- ─── Add login_id to creators (denormalised for direct scoping) ─────────────

ALTER TABLE creators ADD COLUMN IF NOT EXISTS login_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_creators_login_id ON creators(login_id);
