---
name: supabase-setup
description: Supabase database setup for campaign manager app
metadata:
  type: project
---

The app uses Supabase (PostgreSQL) as its database. The schema is defined in `supabase/migrations/00001_initial_schema.sql`.

## Steps to set up

1. Create a free Supabase account at https://supabase.com
2. Create a new project (takes ~1-2 min to provision)
3. Go to **SQL Editor** in the Supabase dashboard
4. Paste and run the contents of `supabase/migrations/00001_initial_schema.sql`
5. Go to **Project Settings → API** and copy:
   - `Project URL` → set as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
   - `anon public key` → set as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
6. Restart the dev server

## Table structure

- `campaigns` — id (UUID PK), name, created_at
- `creators` — id (UUID PK), campaign_id (FK→campaigns), name, phone, handle, target_budget, locked_commercials, reel_link, profile_link, avatar_url, status (enum), metrics (JSONB), removed_reason, removed_at, final_agreed, counter_budget, collab_type, created_at, updated_at

## API routes (all dynamic, server-rendered on demand)

- GET/POST `/api/campaigns` — list / create campaigns
- DELETE `/api/campaigns/[id]` — delete a campaign (cascades)
- GET/PUT `/api/campaigns/[id]/creators` — get / replace all creators
- POST `/api/creators` — add a single creator
- PATCH/DELETE `/api/creators/[id]` — update / delete a creator

## Fallback behavior

- The `useCampaigns` hook fetches from the API. If no campaigns exist, a default "Main Campaign" is created.
- If env vars are missing, the dashboard shows a helpful error message directing the user to set them up.
- The old `useCreators` hook (localStorage) still exists but is unused by the main dashboard.
