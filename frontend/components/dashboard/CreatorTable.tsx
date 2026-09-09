"use client";

import { Creator, CreatorStatus, CreatorUpdate } from "@/lib/types";
import { formatINR } from "@/lib/csv";
import { openWhatsApp } from "@/lib/whatsapp";
import { StatusBadge } from "./StatusBadge";
import { Trash2, Edit2, MessageCircle, Video } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

const InstagramIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface CreatorTableProps {
  creators: Creator[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onUpdateCreator: (id: string, data: CreatorUpdate) => void;
  onDeleteCreator: (id: string) => void;
  onEditCreator: (creator: Creator) => void;
}

export function CreatorTable({
  creators,
  selected,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onUpdateCreator,
  onDeleteCreator,
  onEditCreator,
}: CreatorTableProps) {
  const allSelected = creators.length > 0 && selected.size === creators.length;
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: "reel_link" | "locked_commercials" | "target_budget" | "profile_link";
  } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const startEdit = (
    id: string,
    field: "reel_link" | "locked_commercials" | "target_budget" | "profile_link",
    value: string
  ) => {
    setEditingCell({ id, field });
    setCellValue(value);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    if (field === "reel_link" || field === "profile_link") {
      onUpdateCreator(id, { [field]: cellValue || null });
    } else {
      onUpdateCreator(id, { [field]: parseFloat(cellValue) || 0 });
    }
    setEditingCell(null);
  };

  if (creators.length === 0) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">No creators in this campaign</p>
        <p className="text-sm text-slate-400 mt-1">Upload a CSV sheet or add a creator manually to get started.</p>
      </div>
    );
  }

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full min-w-[1000px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="w-10 px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={allSelected ? onDeselectAll : onSelectAll}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </th>
            {[
              "Creator & Links",
              "Counter Budget",
              "Final & Agreed",
              "Savings",
              "Reel Link",
              "Status",
              "",
            ].map((h) => (
              <th
                key={h}
                className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
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
              <tr
                key={c.id}
                className={clsx(
                  "group transition-colors duration-100 animate-fade-in",
                  isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50/80"
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(c.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </td>

                {/* Creator Profile Image, Name, Handle & IG Link + WhatsApp buttons */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    {/* Scraped Creator Profile Picture */}
                    {avatarUrl && !imageFailed ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={avatarUrl}
                        alt={c.name}
                        onError={() => setFailedImages((prev) => new Set([...prev, c.id]))}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-2xs">
                        <span className="text-white text-xs font-bold">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="min-w-[120px]">
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.handle}</p>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons directly beside creator name */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => onEditCreator(c)}
                        className="inline-flex items-center justify-center w-8 h-7 rounded-md bg-slate-100 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-xs font-semibold transition-all shadow-2xs shrink-0 cursor-pointer"
                        title="Edit creator contact details"
                        aria-label={`Edit ${c.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {profileUrl && (
                        <a
                          href={profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 text-xs font-semibold transition-all shadow-2xs shrink-0"
                          title="Open Instagram Profile"
                        >
                          <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
                          IG Link
                        </a>
                      )}
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          onClick={(e) => {
                            e.preventDefault();
                            openWhatsApp(cleanPhone);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold transition-all shadow-2xs shrink-0"
                          title="Open WhatsApp Chat"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </td>

                {/* Counter (Target Budget) */}
                <td className="px-3 py-3">
                  {editingCell?.id === c.id && editingCell.field === "target_budget" ? (
                    <input
                      autoFocus
                      type="number"
                      value={cellValue}
                      onChange={(e) => setCellValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                      className="w-24 px-2 py-1 text-sm border border-indigo-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(c.id, "target_budget", c.target_budget.toString())}
                      className="text-sm font-medium text-slate-800 hover:text-indigo-600 cursor-pointer text-left transition-colors"
                      title="Click to edit Counter Budget"
                    >
                      {formatINR(c.target_budget || 0)}
                    </button>
                  )}
                </td>

                {/* Final and Agreed Commercials (Barter = 0, 1200 = 0) */}
                <td className="px-3 py-3">
                  {editingCell?.id === c.id && editingCell.field === "locked_commercials" ? (
                    <input
                      autoFocus
                      type="number"
                      value={cellValue}
                      onChange={(e) => setCellValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                      className="w-24 px-2 py-1 text-sm border border-indigo-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  ) : (
                    <button
                      onClick={() =>
                        startEdit(c.id, "locked_commercials", c.locked_commercials.toString())
                      }
                      className="text-sm font-medium text-slate-800 hover:text-indigo-600 cursor-pointer text-left transition-colors"
                      title="Click to edit Final & Agreed Commercial"
                    >
                      {c.locked_commercials === 0 ? (
                        <span className="text-amber-600 font-semibold px-2 py-0.5 rounded bg-amber-50 text-xs border border-amber-200">
                          Barter (₹0)
                        </span>
                      ) : (
                        formatINR(c.locked_commercials || 0)
                      )}
                    </button>
                  )}
                </td>

                {/* Net Savings = Counter - Final and Agreed */}
                <td className="px-3 py-3">
                  <span
                    className={clsx(
                      "text-sm font-bold",
                      savings >= 0 ? "text-emerald-600" : "text-red-500"
                    )}
                  >
                    {savings >= 0 ? "+" : ""}
                    {formatINR(savings)}
                  </span>
                </td>

                {/* Reel Link */}
                <td className="px-3 py-3">
                  {editingCell?.id === c.id && editingCell.field === "reel_link" ? (
                    <input
                      autoFocus
                      type="url"
                      value={cellValue}
                      onChange={(e) => setCellValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                      className="w-36 px-2 py-1 text-xs border border-indigo-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="https://instagram.com/reel/..."
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      {c.reel_link ? (
                        <>
                          <a
                            href={c.reel_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold transition-colors"
                          >
                            <Video className="w-3.5 h-3.5 text-purple-600" />
                            View Reel
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!c.reel_link) {
                                const toast = document.createElement("div");
                                toast.className = "fixed bottom-4 right-4 bg-amber-600 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg z-[100] animate-fade-in";
                                toast.textContent = "No reel link to copy";
                                document.body.appendChild(toast);
                                setTimeout(() => toast.remove(), 2000);
                                return;
                              }
                              navigator.clipboard.writeText(c.reel_link);
                              const toast = document.createElement("div");
                              toast.className = "fixed bottom-4 right-4 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg z-[100] animate-fade-in";
                              toast.textContent = "Reel link copied";
                              document.body.appendChild(toast);
                              setTimeout(() => toast.remove(), 2000);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                            title="Copy reel link"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => startEdit(c.id, "reel_link", c.reel_link ?? "")}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                            title="Edit reel link"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(c.id, "reel_link", "")}
                          className="text-xs text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors font-medium"
                        >
                          + Add Reel Link
                        </button>
                      )}
                    </div>
                  )}
                </td>

                {/* Status Dropdown Tag */}
                <td className="px-3 py-3">
                  <StatusBadge
                    status={c.status}
                    onChange={(s: CreatorStatus) => onUpdateCreator(c.id, { status: s })}
                  />
                </td>

                {/* Delete button */}
                <td className="px-3 py-3">
                  <button
                    onClick={() => onDeleteCreator(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all cursor-pointer p-1"
                    title="Remove creator"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
