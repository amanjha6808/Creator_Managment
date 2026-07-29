"use client";

import { Creator } from "@/lib/types";
import { openWhatsApp } from "@/lib/whatsapp";
import { Image, MessageCircle, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

interface GalleryCreator extends Creator {
  _campaignName?: string;
}

interface CreatorGalleryGridProps {
  creators: GalleryCreator[];
}

/** Check if a creator has a valid Instagram handle or link */
function hasValidIG(c: GalleryCreator): boolean {
  const h = (c.handle || "").replace(/^@/, "").trim();
  if (h) return true;
  const link = (c.profile_link || c.reel_link || "").toLowerCase();
  return link.includes("instagram.com") || link.includes("ig.me");
}

/** Build the Instagram profile URL from a creator */
function igProfileUrl(c: GalleryCreator): string {
  const h = (c.handle || "").replace(/^@/, "").trim();
  if (h) return `https://www.instagram.com/${h}/`;
  return c.profile_link || c.reel_link || "";
}

/** WhatsApp link from phone */
function waUrl(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}`;
}

export function CreatorGalleryGrid({ creators }: CreatorGalleryGridProps) {
  // Only show creators with a valid Instagram handle or link
  const validCreators = creators.filter(hasValidIG);

  if (validCreators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Image className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-600 font-semibold">Gallery is empty</p>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          No removed creators with a valid Instagram handle to show here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {validCreators.map((c, i) => {
        const profileUrl = igProfileUrl(c);
        const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
        const reason = c.removed_reason?.trim() || "NA";

        return (
          <div
            key={c.id}
            className={clsx(
              "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
              "flex flex-col animate-fade-in transition-all duration-200 hover:shadow-md"
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* ─── Body ────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 p-4 flex-1">
              {/* Creator name */}
              <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>

              {/* Reason (red, "NA" if none) */}
              <p className="text-xs text-red-500 leading-snug line-clamp-3">
                {reason}
              </p>

              {/* Commercials */}
              <div className="mt-auto pt-2 text-xs text-slate-500">
                Commercials: <span className="font-semibold text-slate-700">{c.locked_commercials ?? 0}</span>
              </div>
            </div>

            {/* ─── Actions ─────────────────────────────────────────────── */}
            <div className="flex border-t border-slate-100 divide-x divide-slate-100">
              {/* WhatsApp */}
              {cleanPhone ? (
                <a
                  href={waUrl(c.phone)}
                  onClick={(e) => {
                    e.preventDefault();
                    openWhatsApp(c.phone);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              ) : (
                <span className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-300 cursor-not-allowed">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </span>
              )}

              {/* Profile */}
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Profile
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
