import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-login-id",
};

function getLoginId(req: NextRequest): string | null {
  return req.headers.get("x-login-id");
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

/** Delete a campaign — owner only. */
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
      .from("campaigns")
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
    console.error("[DELETE /api/campaigns/:id]", err?.message);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
