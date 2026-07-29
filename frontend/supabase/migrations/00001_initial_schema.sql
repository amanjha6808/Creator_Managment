-- ─── Campaign Manager — Initial Schema ───────────────────────────────────────
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- or apply via `supabase migration up` if using the Supabase CLI.

-- ─── Campaigns table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Creators table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  handle TEXT NOT NULL DEFAULT '',
  target_budget NUMERIC NOT NULL DEFAULT 0,
  locked_commercials NUMERIC NOT NULL DEFAULT 0,
  reel_link TEXT,
  profile_link TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending','Contacted','In Negotiation','Confirmed','Live','Dropped')),
  metrics JSONB DEFAULT NULL,
  removed_reason TEXT,
  removed_at TIMESTAMPTZ,
  final_agreed NUMERIC,
  counter_budget NUMERIC,
  collab_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- This app uses the anon key (no user login), so disable RLS on both tables
-- so the API can read/write freely.

ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE creators DISABLE ROW LEVEL SECURITY;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_creators_campaign_id ON creators(campaign_id);

-- ─── Auto-update updated_at on row change ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_creators_updated_at
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
