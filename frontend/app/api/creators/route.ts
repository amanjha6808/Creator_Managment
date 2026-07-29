import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-login-id",
};

function getLoginId(req: NextRequest): string | null {
  return req.headers.get("x-login-id");
}

/** Add a single creator to a campaign — owner only. */
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
    if (!body || !body.campaign_id) {
      return NextResponse.json(
        { error: "Request body must include 'campaign_id'." },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!body.name?.trim() || !body.handle?.trim()) {
      return NextResponse.json(
        { error: "Name and Handle are required." },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const db = getSupabase();

    const { data: camp } = await db
      .from("campaigns")
      .select("id")
      .eq("id", body.campaign_id)
      .eq("login_id", loginId)
      .maybeSingle();

    if (!camp) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const row = {
      campaign_id: body.campaign_id,
      login_id: loginId,
      name: body.name.trim(),
      phone: body.phone ?? "",
      handle: body.handle.trim(),
      target_budget: body.target_budget ?? 0,
      locked_commercials: body.locked_commercials ?? 0,
      reel_link: body.reel_link ?? null,
      profile_link: body.profile_link ?? null,
      avatar_url: body.avatar_url ?? null,
      status: body.status ?? "Pending",
    };

    const { data, error } = await db
      .from("creators")
      .insert(row)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ creator: data }, { status: 201, headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("[POST /api/creators]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
