import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _serverClient: SupabaseClient | null = null;

const PLACEHOLDER_URL = "https://your-project-id.supabase.co";

function isUnconfigured(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return "Missing Supabase environment variables.";
  if (url === PLACEHOLDER_URL || key === "your-anon-key")
    return "Replace the placeholder Supabase credentials in .env.local with real ones.";
  return null;
}

/** Server-side Supabase client (API routes). */
export function getSupabase(): SupabaseClient {
  if (_serverClient) return _serverClient;
  const msg = isUnconfigured();
  if (msg) throw new Error(msg);
  _serverClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _serverClient;
}

/** Browser-safe Supabase client — use in client components. */
export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined")
    throw new Error("getBrowserSupabase can only be called on the client.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
