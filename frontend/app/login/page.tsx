"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import { FolderKanban, Loader2, AlertCircle } from "lucide-react";

function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // On mount, check if already logged in — use useEffect to avoid render-time redirect
  useEffect(() => {
    const stored = localStorage.getItem("login_id");
    if (stored) {
      router.replace("/dashboard");
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = loginId.trim();
    if (trimmed.length < 2) {
      setError("Login ID must be at least 2 characters.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const supabase = getBrowserSupabase();

      // 1. Check if user exists
      const { data: existing } = await supabase
        .from("dashboard_users")
        .select("login_id")
        .eq("login_id", trimmed)
        .maybeSingle();

      // 2. If not, create the user with an auto-generated password
      if (!existing) {
        const pwHash = generateHash(trimmed + ":" + "campaign-manager-secret-2026");
        const { error: insertError } = await supabase
          .from("dashboard_users")
          .insert({ login_id: trimmed, password_hash: pwHash });

        if (insertError) throw new Error(insertError.message);
      }

      // 3. Persist session and route
      localStorage.setItem("login_id", trimmed);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Campaign Manager</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h1 className="text-xl font-bold text-slate-900 text-center mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 text-center mb-6">
            Enter your Login ID to get started.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login_id" className="text-sm font-medium text-slate-700 mb-1.5 block">
                Login ID
              </label>
              <input
                id="login_id"
                type="text"
                placeholder="e.g. your-name or team-name"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                disabled={submitting}
                autoFocus
                autoComplete="off"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 disabled:opacity-50 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loginId.trim().length < 2}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Continue →"
              )}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          New users are created automatically.
        </p>
      </div>
    </div>
  );
}
