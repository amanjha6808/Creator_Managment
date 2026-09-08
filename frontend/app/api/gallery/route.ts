import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { extractHandleFromProfile } from "@/lib/csv";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-login-id",
};

function getLoginId(req: NextRequest): string | null {
  return req.headers.get("x-login-id");
}

function normalizeLink(link: string | null | undefined): string {
  if (!link) return "";
  return link
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .replace(/[?#].*$/, "");
}

/**
 * Find (or create) the user's "Gallery" campaign — the pool that holds all
 * imported gallery creators. Imported rows are stored with `removed_reason`
 * set so they surface in the Creator Gallery and never in a campaign pipeline.
 */
async function ensureGalleryCampaign(
  db: ReturnType<typeof getSupabase>,
  loginId: string,
): Promise<string> {
  const { data: existing } = await db
    .from("campaigns")
    .select("id")
    .eq("login_id", loginId)
    .eq("name", "Gallery")
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await db
    .from("campaigns")
    .insert({ name: "Gallery", login_id: loginId })
    .select("id")
    .single();

  if (error || !created?.id) {
    throw new Error(error?.message || "Failed to create the Gallery pool.");
  }
  return created.id;
}

/** List the creator gallery pool (the internal "Gallery" campaign) — owner only. */
export async function GET(request: NextRequest) {
  try {
    const loginId = getLoginId(request);
    if (!loginId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const db = getSupabase();
    const { data: campaign } = await db
      .from("campaigns")
      .select("id")
      .eq("login_id", loginId)
      .eq("name", "Gallery")
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json({ creators: [] }, { headers: CORS_HEADERS });
    }

    const { data, error } = await db
      .from("creators")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      {
        creators: (data ?? []).map((cr: any) => ({
          ...cr,
          _campaignName: "Gallery",
        })),
      },
      { headers: CORS_HEADERS },
    );
  } catch (err: any) {
    console.error("[GET /api/gallery]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/** Bulk-import creators into the gallery pool — owner only. */
export async function POST(request: NextRequest) {
  try {
    const loginId = getLoginId(request);
    if (!loginId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const body = await request.json().catch(() => null);
    const incoming = body?.creators;
    if (!Array.isArray(incoming)) {
      return NextResponse.json(
        { error: "Request body must include a 'creators' array." },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const db = getSupabase();
    const galleryCampaignId = await ensureGalleryCampaign(db, loginId);

    // Fetch existing pool creators for deduplication
    const { data: existingRows, error: fetchError } = await db
      .from("creators")
      .select("id, name, phone, handle, profile_link")
      .eq("campaign_id", galleryCampaignId);

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const seenUsernames = new Set<string>();
    const seenPhones = new Set<string>();
    const seenLinks = new Set<string>();

    for (const row of existingRows ?? []) {
      const link = normalizeLink(row.profile_link);
      const username = extractHandleFromProfile(
        (row.handle ?? "") || (row.profile_link ?? ""),
      )
        .toLowerCase()
        .replace(/^@/, "")
        .trim();
      const phone = (row.phone ?? "").replace(/\D/g, "");
      if (link) seenLinks.add(link);
      if (username) seenUsernames.add(username);
      if (phone) seenPhones.add(phone);
    }

    // Normalize + filter incoming rows: keep anything with a link, handle, or phone
    const validRows = incoming
      .map((c: any) => ({
        name: String(c.name ?? "").trim(),
        phone: String(c.phone ?? "").trim(),
        handle: String(c.handle ?? "").replace(/^@/, "").trim(),
        profile_link:
          c.profile_link && String(c.profile_link).trim()
            ? String(c.profile_link).trim()
            : null,
      }))
      .filter((c) => c.profile_link || c.handle || c.phone);

    // Deduplicate within the batch, then against the existing pool — matching
    // by profile username (handle or extracted from the profile link) + phone.
    const batchSeen = new Set<string>();
    const toInsert: typeof validRows = [];
    let duplicates = 0;

    for (const c of validRows) {
      const link = normalizeLink(c.profile_link);
      const username = extractHandleFromProfile(
        c.handle || c.profile_link || "",
      )
        .toLowerCase()
        .replace(/^@/, "")
        .trim();
      const phone = c.phone.replace(/\D/g, "");

      const batchKey = link
        ? `l:${link}`
        : username
          ? `u:${username}`
          : `p:${phone}`;
      if (batchSeen.has(batchKey)) {
        duplicates++;
        continue;
      }
      if (
        (link && seenLinks.has(link)) ||
        (username && seenUsernames.has(username)) ||
        (phone && seenPhones.has(phone))
      ) {
        duplicates++;
        continue;
      }

      batchSeen.add(batchKey);
      if (link) seenLinks.add(link);
      if (username) seenUsernames.add(username);
      if (phone) seenPhones.add(phone);

      toInsert.push(c);
    }

    const now = new Date().toISOString();
    const rows = toInsert.map((c) => ({
      campaign_id: galleryCampaignId,
      login_id: loginId,
      name: c.name || (c.handle ? `@${c.handle}` : "Unknown"),
      phone: c.phone,
      handle: c.handle,
      profile_link: c.profile_link,
      target_budget: 0,
      locked_commercials: 0,
      status: "Pending",
      removed_reason: "Imported to gallery",
      removed_at: now,
    }));

    let inserted: any[] = [];
    if (rows.length > 0) {
      const { data, error: insError } = await db
        .from("creators")
        .insert(rows)
        .select();

      if (insError) {
        return NextResponse.json(
          { error: insError.message },
          { status: 500, headers: CORS_HEADERS },
        );
      }
      inserted = data ?? [];
    }

    return NextResponse.json(
      {
        added: inserted.length,
        duplicates,
        total: validRows.length,
        creators: inserted,
      },
      { status: 201, headers: CORS_HEADERS },
    );
  } catch (err: any) {
    console.error("[POST /api/gallery]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}