import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-login-id",
};

function getLoginId(req: NextRequest): string | null {
  return req.headers.get("x-login-id");
}

/** Update a creator — owner only. */
export async function PATCH(
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
    if (!body) {
      return NextResponse.json(
        { error: "Request body is required." },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const db = getSupabase();

    const allowedFields = [
      "name", "phone", "handle", "target_budget", "locked_commercials",
      "reel_link", "profile_link", "avatar_url", "status",
      "removed_reason", "removed_at", "final_agreed", "counter_budget", "collab_type",
      "tags",
    ];

    const update: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    const { data, error } = await db
      .from("creators")
      .update(update)
      .eq("id", id)
      .eq("login_id", loginId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ creator: data }, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("[PATCH /api/creators/:id]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/** Delete a creator — owner only. */
export async function DELETE(
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

    const { error } = await db
      .from("creators")
      .delete()
      .eq("id", id)
      .eq("login_id", loginId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("[DELETE /api/creators/:id]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
