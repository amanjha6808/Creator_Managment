"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CreatorTable } from "@/components/dashboard/CreatorTable";
import { CreatorCards } from "@/components/dashboard/CreatorCards";
import { CreatorGalleryGrid } from "@/components/dashboard/CreatorGalleryGrid";
import { CSVUploadModal } from "@/components/modals/CSVUploadModal";
import { AddCreatorModal } from "@/components/modals/AddCreatorModal";
import { DeleteCreatorModal } from "@/components/modals/DeleteCreatorModal";
import { Button } from "@/components/ui/Button";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Creator, CreatorStatus } from "@/lib/types";
import { exportCommercialSavingsCSV } from "@/lib/csv";
import { Search, Users, Image, Download, LogOut, Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Modal = "csv" | "addCreator" | null;
type Tab = "dashboard" | "gallery";

export default function DashboardPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check session — in useEffect to avoid render-time redirect
  useEffect(() => {
    const stored = localStorage.getItem("login_id");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setLoginId(stored);
    setAuthChecked(true);
  }, [router]);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<CreatorStatus | "All">("All");
  const [pendingDelete, setPendingDelete] = useState<{ creator: Creator; campaignName: string } | null>(null);

  const {
    campaigns,
    activeCampaign,
    activeCampaignId,
    creators,
    removedCreators,
    selected,
    summary,
    hydrated,
    apiError,
    createCampaign,
    deleteCampaign,
    switchCampaign,
    replaceCreatorsWithSheet,
    addCreator,
    updateCreator,
    removeCreator,
    toggleSelect,
    selectAll,
    deselectAll,
  } = useCampaigns();

  // Intercept delete to show reason modal
  const handleDeleteCreator = (id: string) => {
    const creator = creators.find((c) => c.id === id);
    if (!creator) { removeCreator(id); return; }
    const c = campaigns.find((camp) => camp.creators.some((cr) => cr.id === id));
    setPendingDelete({ creator, campaignName: c?.name ?? "Unknown" });
  };

  const handleConfirmDelete = (reason: string) => {
    if (!pendingDelete) return;
    removeCreator(pendingDelete.creator.id, reason);
    setPendingDelete(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("login_id");
    router.push("/login");
  };

  // Filtered & searched creators
  const filteredCreators = creators.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Export handler
  const handleExport = () => {
    exportCommercialSavingsCSV(creators);
  };

  const STATUS_TABS: (CreatorStatus | "All")[] = [
    "All", "Pending", "Contacted", "In Negotiation", "Confirmed", "Live", "Dropped",
  ];

  const statusCounts = STATUS_TABS.reduce<Record<string, number>>((acc, s) => {
    acc[s] =
      s === "All"
        ? creators.length
        : creators.filter((c) => c.status === s).length;
    return acc;
  }, {});

  // Waiting for auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // Show loading spinner while campaign data is being fetched
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading campaigns…</p>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <p className="text-red-600 font-semibold text-lg">Failed to load data</p>
          <p className="text-sm text-slate-500 mt-1">{apiError}</p>
          <p className="text-xs text-slate-400 mt-4">
            Make sure your Supabase project is running and credentials are correct.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            className="mt-4"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans flex-col md:flex-row">
      {/* Mobile menu overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "md:block md:static md:z-auto md:translate-x-0 md:transition-none",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={(t) => { setActiveTab(t); setMobileSidebarOpen(false); }}
          campaigns={campaigns}
          activeCampaignId={activeCampaignId}
          onSelectCampaign={(id) => { switchCampaign(id); setMobileSidebarOpen(false); }}
          onCreateCampaign={createCampaign}
          onDeleteCampaign={deleteCampaign}
          removedCount={removedCreators.length}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          campaigns={campaigns}
          activeCampaignId={activeCampaignId}
          totalCreators={creators.length}
          onSelectCampaign={switchCampaign}
          onCreateCampaign={createCampaign}
          onUploadCSV={() => setModal("csv")}
          onAddCreator={() => setModal("addCreator")}
          onExport={handleExport}
          onLogout={handleLogout}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 flex flex-col gap-4 p-3 sm:p-4 md:p-6 pb-8">
          {activeTab === "gallery" ? (
            /* ─── Creator Gallery ────────────────────────────────────────── */
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                <Image className="w-5 h-5 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900">Creator Gallery</h2>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500 font-medium">
                  {removedCreators.length}
                </span>
              </div>
              <div className="p-4 md:p-6">
                <CreatorGalleryGrid creators={removedCreators} />
              </div>
            </div>
          ) : (
            /* ─── Campaign Pipeline ──────────────────────────────────────── */
            <>
              {/* Summary Cards */}
              <SummaryCards summary={summary} />

              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 px-4 md:px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      {activeCampaign.name} — Pipeline
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500 font-medium">
                        {filteredCreators.length}
                      </span>
                    </h2>

                    {/* Mobile actions */}
                    <div className="flex items-center gap-2 md:hidden">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Download className="w-3.5 h-3.5" />}
                        onClick={handleExport}
                      >
                        Export Savings
                      </Button>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by name, handle, or phone…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Status Filter Tabs */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 md:flex-wrap">
                    {STATUS_TABS.map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={clsx(
                          "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap",
                          filterStatus === status
                            ? "bg-indigo-600 text-white shadow-sm font-semibold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {status}
                        <span
                          className={clsx(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                            filterStatus === status
                              ? "bg-indigo-500 text-white"
                              : "bg-white text-slate-500"
                          )}
                        >
                          {statusCounts[status] ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Data Table */}
                <CreatorTable
                  creators={filteredCreators}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                  onUpdateCreator={updateCreator}
                  onDeleteCreator={handleDeleteCreator}
                />

                {/* Mobile Stacked Cards */}
                <CreatorCards
                  creators={filteredCreators}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onUpdateCreator={updateCreator}
                  onDeleteCreator={handleDeleteCreator}
                />
              </div>
            </>
          )}
        </main>

        {/* Bottom logout bar */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            Logged in as <strong className="text-slate-600">{loginId}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 transition-colors cursor-pointer font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal === "csv" && (
        <CSVUploadModal
          onImport={async (newCreators) => {
            try {
              console.log("CSV import payload", { creators: newCreators });
              await replaceCreatorsWithSheet(newCreators);
            } catch (error) {
              console.error("CSV import failed", error);
              throw error;
            }
          }}
          onClose={() => setModal(null)}
        />
      )}

      {pendingDelete && (
        <DeleteCreatorModal
          name={pendingDelete.creator.name}
          handle={pendingDelete.creator.handle}
          campaignName={pendingDelete.campaignName}
          onConfirm={handleConfirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}

      {modal === "addCreator" && (
        <AddCreatorModal
          onAdd={async (creatorData) => {
            try {
              console.log("Manual creator payload", { creatorData });
              await addCreator(creatorData);
            } catch (error) {
              console.error("Manual creator save failed", error);
              throw error;
            }
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
