"use client";

import { Creator, CreatorStatus, CreatorUpdate } from "@/lib/types";
import { formatINR } from "@/lib/csv";
import { openWhatsApp } from "@/lib/whatsapp";
import { StatusBadge } from "./StatusBadge";
import { Trash2, MessageCircle, Video, Edit2 } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

const InstagramIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface CreatorCardsProps {
  creators: Creator[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdateCreator: (id: string, data: CreatorUpdate) => void;
  onDeleteCreator: (id: string) => void;
  onEditCreator: (creator: Creator) => void;
}

export function CreatorCards({
  creators,
  selected,
  onToggleSelect,
  onUpdateCreator,
  onDeleteCreator,
  onEditCreator,
}: CreatorCardsProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [editingReel, setEditingReel] = useState<{ id: string; value: string } | null>(null);

  const commitReel = (c: Creator) => {
    if (editingReel?.id !== c.id) return;
    onUpdateCreator(c.id, { reel_link: editingReel.value.trim() || null });
    setEditingReel(null);
  };

  if (creators.length === 0) {
    return (
      <div className="md:hidden flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">No creators in this campaign</p>
        <p className="text-sm text-slate-400 mt-1">Upload a CSV sheet or add a creator to get started.</p>
      </div>
    );
  }

  return (
    <div className="md:hidden flex flex-col gap-3 p-4">
      {creators.map((c, i) => {
        const savings = (Number(c.target_budget) || 0) - (Number(c.locked_commercials) || 0);
        const isSelected = selected.has(c.id);
        const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
        const cleanHandle = c.handle ? c.handle.replace(/^@/, "").trim() : "";

        const profileUrl =
          c.profile_link ||
          (cleanHandle ? `https://www.instagram.com/${cleanHandle}/` : null);

        const avatarUrl =
          c.avatar_url || (cleanHandle ? `https://unavatar.io/instagram/${cleanHandle}` : null);
        const imageFailed = failedImages.has(c.id);

        
        return (
          <div
            key={c.id}
            className={clsx(
              "bg-white rounded-xl border shadow-sm transition-all duration-200 animate-fade-in overflow-hidden",
              isSelected ? "border-indigo-300 ring-2 ring-indigo-100" : "border-slate-100"
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* Card Header: Creator info + Profile Picture + IG & WhatsApp buttons right beside name */}
            <div className="flex flex-col gap-2.5 px-4 pt-4 pb-3 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(c.id)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />

                {avatarUrl && !imageFailed ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt={c.name}
                    onError={() => setFailedImages((prev) => new Set([...prev, c.id]))}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 truncate">{c.handle}</p>
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <StatusBadge
                  status={c.status}
                  onChange={(s: CreatorStatus) => onUpdateCreator(c.id, { status: s })}
                />
              </div>

              {/* Action Buttons directly beside name block */}
              <div className="flex items-center gap-2 pl-12">
                {profileUrl && (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-pink-50 text-pink-700 border border-pink-200 text-xs font-semibold hover:bg-pink-100 transition-colors"
                  >
                    <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
                    IG Profile
                  </a>
                )}
                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    onClick={(e) => {
                      e.preventDefault();
                      openWhatsApp(cleanPhone);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={() => onEditCreator(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Edit creator contact details"
                  aria-label={`Edit ${c.name}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteCreator(c.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete creator"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Financial row */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 px-0 py-3 bg-slate-50/40">
              <div className="flex flex-col items-center gap-0.5 px-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Counter</p>
                <p className="text-xs font-bold text-slate-800">{formatINR(c.target_budget || 0)}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Final/Agreed</p>
                <p className="text-xs font-bold text-slate-800">
                  {c.locked_commercials === 0 ? (
                    <span className="text-amber-600 font-semibold">Barter</span>
                  ) : (
                    formatINR(c.locked_commercials || 0)
                  )}
                </p>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Savings</p>
                <p
                  className={clsx(
                    "text-xs font-bold",
                    savings >= 0 ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {savings >= 0 ? "+" : ""}
                  {formatINR(savings)}
                </p>
              </div>
            </div>

            
            {/* Reel Link — view / copy / edit / add */}
            <div className="px-4 py-2 bg-purple-50/50 border-t border-purple-50">
              {editingReel?.id === c.id ? (
                <input
                  autoFocus
                  type="url"
                  value={editingReel.value}
                  onChange={(e) => setEditingReel({ id: c.id, value: e.target.value })}
                  onBlur={() => commitReel(c)}
                  onKeyDown={(e) => e.key === "Enter" && commitReel(c)}
                  placeholder="https://instagram.com/reel/..."
                  className="w-full px-2 py-1.5 text-xs border border-purple-300 rounded-md outline-none focus:ring-2 focus:ring-purple-100 bg-white"
                />
              ) : c.reel_link ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-purple-700 font-medium flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-purple-600" />
                    Reel Link
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.reel_link as string);
                        const toast = document.createElement("div");
                        toast.className = "fixed bottom-4 right-4 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg z-[100] animate-fade-in";
                        toast.textContent = "Reel link copied";
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 2000);
                      }}
                      className="text-xs font-medium text-slate-600 hover:text-indigo-600 underline"
                      title="Copy reel link"
                    >
                      Copy
                    </button>
                    <a
                      href={c.reel_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline"
                    >
                      Watch Reel →
                    </a>
                    <button
                      onClick={() => setEditingReel({ id: c.id, value: c.reel_link ?? "" })}
                      className="text-xs font-medium text-slate-500 hover:text-indigo-600 underline"
                      title="Edit reel link"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingReel({ id: c.id, value: "" })}
                  className="w-full text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center justify-center gap-1 py-0.5 cursor-pointer"
                >
                  + Add Reel Link
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
