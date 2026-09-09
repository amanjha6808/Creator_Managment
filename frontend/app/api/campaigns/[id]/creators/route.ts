import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-login-id",
};

function getLoginId(req: NextRequest): string | null {
  return req.headers.get("x-login-id");
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

/** Get all creators for a campaign — owner only. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loginId = getLoginId(request);
    if (!loginId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const { id } = await context.params;
    const db = getSupabase();

    const { data: camp } = await db
      .from("campaigns")
      .select("id")
      .eq("id", id)
      .eq("login_id", loginId)
      .maybeSingle();

    if (!camp) {
      return NextResponse.json({ creators: [] }, { headers: CORS_HEADERS });
    }

    const { data, error } = await db
      .from("creators")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ creators: data }, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/campaigns/:id/creators]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/** Replace all creators in a campaign — owner only. */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loginId = getLoginId(request);
    if (!loginId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const incoming = body?.creators;
    const db = getSupabase();

    if (!Array.isArray(incoming)) {
      return NextResponse.json(
        { error: "Request body must include a 'creators' array." },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { data: camp } = await db
      .from("campaigns")
      .select("id")
      .eq("id", id)
      .eq("login_id", loginId)
      .maybeSingle();

    if (!camp) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    await db.from("creators").delete().eq("campaign_id", id).eq("login_id", loginId);

    const rows = incoming.map((c: any) => ({
      campaign_id: id,
      login_id: loginId,
      name: c.name ?? "",
      phone: c.phone ?? "",
      handle: c.handle ?? "",
      target_budget: c.target_budget ?? 0,
      locked_commercials: c.locked_commercials ?? 0,
      reel_link: c.reel_link ?? null,
      profile_link: c.profile_link ?? null,
      avatar_url: c.avatar_url ?? null,
      status: c.status ?? "Pending",
      removed_reason: c.removed_reason ?? null,
      removed_at: c.removed_at ?? null,
      final_agreed: c.final_agreed ?? null,
      counter_budget: c.counter_budget ?? null,
      collab_type: c.collab_type ?? null,
      tags: c.tags ?? [],
    }));

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

    return NextResponse.json({ creators: data }, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("[PUT /api/campaigns/:id/creators]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
