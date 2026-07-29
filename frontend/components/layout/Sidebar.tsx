"use client";

import { clsx } from "clsx";
import { LayoutDashboard, Image, Zap, Plus, Trash2, FolderKanban } from "lucide-react";
import { Campaign } from "@/hooks/useCampaigns";
import { useState } from "react";

interface SidebarProps {
  activeTab: "dashboard" | "gallery";
  onTabChange: (tab: "dashboard" | "gallery") => void;
  campaigns: Campaign[];
  activeCampaignId: string;
  onSelectCampaign: (id: string) => void;
  onCreateCampaign: (name: string) => void;
  onDeleteCampaign: (id: string) => void;
  removedCount: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  onCreateCampaign,
  onDeleteCampaign,
  removedCount,
}: SidebarProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCampaignName.trim()) {
      onCreateCampaign(newCampaignName.trim());
      setNewCampaignName("");
      setShowAddInput(false);
    }
  };

  return (
    <aside className="flex flex-col w-64 md:w-64 min-h-screen bg-white border-r border-slate-100 py-4 md:py-6 px-2 md:px-3 shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
          <Zap className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">CampaignIQ</p>
          <p className="text-[10px] text-slate-400">Influencer Manager</p>
        </div>
      </div>

      {/* Nav items: Dashboard & Gallery */}
      <nav className="flex flex-col gap-1 mb-6">
        <button
          onClick={() => onTabChange("dashboard")}
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left",
            activeTab === "dashboard"
              ? "bg-indigo-50 text-indigo-700 shadow-2xs font-semibold"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <LayoutDashboard
            className={clsx("w-4.5 h-4.5 shrink-0", activeTab === "dashboard" ? "text-indigo-600" : "text-slate-400")}
          />
          Dashboard
        </button>

        <button
          onClick={() => onTabChange("gallery")}
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left",
            activeTab === "gallery"
              ? "bg-indigo-50 text-indigo-700 shadow-2xs font-semibold"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Image
            className={clsx("w-4.5 h-4.5 shrink-0", activeTab === "gallery" ? "text-indigo-600" : "text-slate-400")}
          />
          <span className="flex items-center gap-2">
            Creator Gallery
            {removedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                {removedCount}
              </span>
            )}
          </span>
        </button>
      </nav>

      {/* Campaigns Section */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-slate-100 pt-4 px-1">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5" />
            Campaigns ({campaigns.length})
          </span>
          <button
            onClick={() => setShowAddInput((v) => !v)}
            className="p-1 rounded text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
            title="Add New Campaign"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Add Campaign Form */}
        {showAddInput && (
          <form onSubmit={handleAddSubmit} className="mb-3 px-1">
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                placeholder="Campaign Name…"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                className="px-2 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold shrink-0"
              >
                Add
              </button>
            </div>
          </form>
        )}

        {/* Campaign List */}
        <div className="flex flex-col gap-1 overflow-y-auto max-h-64 pr-1">
          {campaigns.map((camp) => {
            const isActive = camp.id === activeCampaignId;
            return (
              <div
                key={camp.id}
                onClick={() => onSelectCampaign(camp.id)}
                className={clsx(
                  "group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all",
                  isActive
                    ? "bg-slate-900 text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span
                    className={clsx(
                      "w-2 h-2 rounded-full shrink-0",
                      isActive ? "bg-indigo-400" : "bg-slate-300"
                    )}
                  />
                  <span className="truncate">{camp.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                      isActive ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {camp.creators.length}
                  </span>
                  {campaigns.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete campaign "${camp.name}"?`)) {
                          onDeleteCampaign(camp.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 p-1 transition-opacity"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto px-3 py-3 rounded-xl bg-indigo-50/70 border border-indigo-100/80">
        <p className="text-xs font-semibold text-indigo-800 truncate">
          Active: {campaigns.find((c) => c.id === activeCampaignId)?.name}
        </p>
        <p className="text-[10px] text-indigo-600 mt-0.5">
          {campaigns.find((c) => c.id === activeCampaignId)?.creators.length || 0} creator(s) loaded
        </p>
      </div>
    </aside>
  );
}
