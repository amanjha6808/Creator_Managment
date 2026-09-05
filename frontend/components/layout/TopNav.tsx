"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Upload, Download, UserPlus, FolderKanban, Plus, Menu, LogOut, RefreshCw } from "lucide-react";
import { Campaign } from "@/hooks/useCampaigns";

interface TopNavProps {
  campaigns: Campaign[];
  activeCampaignId: string;
  totalCreators: number;
  onSelectCampaign: (id: string) => void;
  onCreateCampaign: (name: string) => void;
  onUploadCSV: () => void;
  onAddCreator: () => void;
  onExport: () => void;
  onSyncContacts?: () => void;
  onSyncing?: boolean;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

export function TopNav({
  campaigns,
  activeCampaignId,
  totalCreators,
  onSelectCampaign,
  onCreateCampaign,
  onUploadCSV,
  onAddCreator,
  onExport,
  onSyncContacts,
  onSyncing,
  onLogout,
  onToggleSidebar,
}: TopNavProps) {
  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bg-white border-b border-slate-100 px-2 sm:px-4 md:px-6 py-2 sm:py-3.5 sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center justify-between gap-1 sm:gap-3">
        {/* Left: Campaign selector & title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger menu for mobile */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <FolderKanban className="hidden sm:inline-flex w-5 h-5 text-indigo-600 shrink-0" />
            <div className="relative min-w-0 max-w-[120px] sm:max-w-[200px]">
              <select
                value={activeCampaignId}
                onChange={(e) => onSelectCampaign(e.target.value)}
                className="text-sm sm:text-base font-bold text-slate-900 bg-transparent border-0 outline-none cursor-pointer p-0 pr-5 appearance-none font-sans block truncate w-full"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.creators.length})
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-900 pointer-events-none shrink-0"
                viewBox="0 0 10 6" fill="none"
              >
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {totalCreators} creator(s) in active campaign
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0 overflow-x-auto max-w-[60vw] md:max-w-none">
          {/* New Campaign button (hidden on very small screens) */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setNewCampaignName("");
              setShowNewCampaignModal(true);
              // Focus input after modal renders
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="hidden md:inline-flex"
          >
            New Campaign
          </Button>

          {/* Sync Contacts */}
          {onSyncContacts && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={onSyncContacts}
              loading={onSyncing}
            >
              <span className="hidden sm:inline">Sync</span>
            </Button>
          )}

          {/* Export Savings */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={onExport}
          >
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Upload CSV */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5" />}
            onClick={onUploadCSV}
          >
            <span className="hidden sm:inline">CSV</span>
          </Button>

          {/* Add Creator */}
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={onAddCreator}
          >
            <span className="hidden sm:inline">Add</span>
          </Button>

          {/* Logout */}
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              icon={<LogOut className="w-3.5 h-3.5" />}
              onClick={onLogout}
              title="Logout"
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>

      {/* New Campaign Modal — replaces browser prompt() */}
      <Modal
        open={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
        title="New Campaign"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newCampaignName.trim()) {
              onCreateCampaign(newCampaignName.trim());
              setShowNewCampaignModal(false);
              setNewCampaignName("");
            }
          }}
          className="flex flex-col gap-4"
        >
          <Input
            ref={inputRef}
            label="Campaign name"
            placeholder="Enter campaign name…"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            fullWidth
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowNewCampaignModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newCampaignName.trim()}
            >
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
}
