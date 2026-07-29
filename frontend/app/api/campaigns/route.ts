import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-login-id",
};

function getLoginId(req: NextRequest): string | null {
  return req.headers.get("x-login-id");
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

/** List campaigns for the current user. */
export async function GET(request: NextRequest) {
  try {
    const loginId = getLoginId(request);
    if (!loginId) {
      return NextResponse.json(
        { error: "Not authenticated. Provide x-login-id header." },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const db = getSupabase();
    const { data, error } = await db
      .from("campaigns")
      .select("*")
      .eq("login_id", loginId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ campaigns: data }, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/campaigns]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/** Create a new campaign. */
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
    const name = body?.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Campaign name is required." },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const db = getSupabase();
    const { data, error } = await db
      .from("campaigns")
      .insert({ name, login_id: loginId })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ campaign: data }, { status: 201, headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("[POST /api/campaigns]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
