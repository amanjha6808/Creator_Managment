"use client";

import { useState, useCallback, useRef } from "react";
import { CreatorCreate } from "@/lib/types";
import { parseCSVFile, downloadSampleCSV } from "@/lib/csv";
import { Button } from "@/components/ui/Button";
import { X, Upload, FileText, CheckCircle, AlertCircle, Download, Table2, Globe, ChevronDown, HelpCircle } from "lucide-react";
import { clsx } from "clsx";

interface CSVUploadModalProps {
  onImport: (creators: CreatorCreate[]) => Promise<void>;
  onClose: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";
type SourceTab = "csv" | "sheets";

export function CSVUploadModal({ onImport, onClose }: CSVUploadModalProps) {
  const [sourceTab, setSourceTab] = useState<SourceTab>("csv");
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<CreatorCreate[]>([]);
  const [error, setError] = useState<string | null>(null);

  // CSV state
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Google Sheets state
  const [sheetUrl, setSheetUrl] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [tabsGids, setTabsGids] = useState<Record<string, string>>({});
  const [selectedTab, setSelectedTab] = useState("");
  const [fetchingTabs, setFetchingTabs] = useState(false);
  const [tabsFound, setTabsFound] = useState(true);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [manualTabName, setManualTabName] = useState("");
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [showApiKeyHint, setShowApiKeyHint] = useState(false);

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setError(null);
    setFileName("");
    setSheetUrl("");
    setTabs([]);
    setTabsGids({});
    setSelectedTab("");
    setTabsFound(true);
    setNeedsApiKey(false);
    setManualTabName("");
    setUseManualEntry(false);
    setShowApiKeyHint(false);
    setUseManualEntry(false);
  };

  // ─── CSV Handlers ──────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    setError(null);
    setFileName(file.name);
    try {
      const creators = await parseCSVFile(file);
      const valid = creators.filter((c) => c.name.trim());
      if (valid.length === 0) {
        setError("No valid creator rows found. Check that your CSV has a 'Name' column.");
        return;
      }
      setParsed(valid);
      setStep("preview");
    } catch {
      setError("Failed to parse CSV. Please check the file format.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ─── Google Sheets Handlers ──────────────────────────────────────────────────

  const handleFetchTabs = async () => {
    if (!sheetUrl.trim()) {
      setError("Please enter a Google Sheets URL.");
      return;
    }

    setError(null);
    setFetchingTabs(true);
    setTabs([]);
    setTabsGids({});
    setSelectedTab("");
    setTabsFound(true);
    setNeedsApiKey(false);
    setUseManualEntry(false);
    setShowApiKeyHint(false);

    try {
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim(), action: "list-tabs" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch sheet tabs.");
        setTabsFound(false);
        return;
      }

      if (data.tabs && data.tabs.length > 0) {
        setTabs(data.tabs);
        setTabsGids(data.gids || {});
        setSelectedTab(data.tabs[0]);
        setTabsFound(true);
        setNeedsApiKey(!!data.needsApiKey);
        // If only 1 tab was found and it's a generic name, suggest API key
        if (data.needsApiKey && data.tabs.length === 1 && /^Sheet\d+$/.test(data.tabs[0])) {
          setShowApiKeyHint(true);
        }
      } else {
        setTabsFound(false);
        setNeedsApiKey(!!data.needsApiKey);
        const msg = data.needsApiKey
          ? "Could not auto-detect sheet tabs. To detect multiple worksheets, set up a Google API key:\n\n" +
            "1. Go to https://console.cloud.google.com/apis/credentials\n" +
            "2. Enable Google Sheets API and create an API key\n" +
            "3. Add GOOGLE_SHEETS_API_KEY to .env.local\n\n" +
            "You can still try importing the first sheet using the manual option below."
          : "Could not auto-detect sheet tabs. The sheet may not be publicly accessible.\n" +
            "Try importing with the manual entry below.";
        setError(msg);
      }
    } catch {
      setTabsFound(false);
      setError("Failed to connect. Please check the URL and try again.");
    } finally {
      setFetchingTabs(false);
    }
  };

  const handleImportSheet = async () => {
    const tab = useManualEntry ? manualTabName : selectedTab;
    if (!tab && !useManualEntry) {
      setError("Please select a sheet tab to import.");
      return;
    }

    setStep("importing");
    setError(null);

    try {
      const body: Record<string, any> = { url: sheetUrl.trim(), action: "import" };

      // Use manual tab name if provided, otherwise use selected tab
      if (useManualEntry && manualTabName.trim()) {
        body.tabName = manualTabName.trim();
      } else if (selectedTab) {
        body.tabName = selectedTab;
        if (tabsGids[selectedTab]) {
          body.gid = tabsGids[selectedTab];
        }
      }

      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed.");
        setStep("upload");
        return;
      }

      if (!data.csvData) {
        setError("No data received from the sheet.");
        setStep("upload");
        return;
      }

      // Parse the CSV data using existing parseCSVFile
      const blob = new Blob([data.csvData], { type: "text/csv" });
      const file = new File([blob], "sheet.csv", { type: "text/csv" });
      const creators = await parseCSVFile(file);
      const valid = creators.filter((c) => c.name.trim());

      if (valid.length === 0) {
        setError("No valid creator rows found in the selected tab.");
        setStep("upload");
        return;
      }

      setParsed(valid);
      setStep("preview");
    } catch {
      setError("Failed to import sheet data. Please try again.");
      setStep("upload");
    }
  };

  // ─── Common Import ───────────────────────────────────────────────────────────

  const handleImport = async () => {
    setStep("importing");
    try {
      await onImport(parsed);
      setStep("done");
    } catch {
      setError("Import failed. Please try again.");
      setStep("preview");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Import Creators</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Tabs */}
        {step === "upload" && (
          <div className="px-5 pt-4 pb-0">
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
              <button
                onClick={() => { setSourceTab("csv"); setError(null); }}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer",
                  sourceTab === "csv" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <FileText className="w-4 h-4" />
                Upload CSV
              </button>
              <button
                onClick={() => { setSourceTab("sheets"); setError(null); }}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer",
                  sourceTab === "sheets" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Globe className="w-4 h-4" />
                Google Sheets
              </button>
            </div>
          </div>
        )}

        <div className="p-5">
          {step === "upload" && sourceTab === "csv" && (
            <div className="flex flex-col gap-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={clsx(
                  "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200",
                  dragging
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Drop your CSV here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports: Name, Phone, Handle, Target Budget, Locked Commercials, Reel Link, Status
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Download template */}
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                Download sample CSV template
              </button>
            </div>
          )}

          {step === "upload" && sourceTab === "sheets" && (
            <div className="flex flex-col gap-4">
              {/* Sheet URL input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Google Sheets URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => { setSheetUrl(e.target.value); setError(null); }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white transition-all"
                  />
                </div>
              </div>

              {/* Fetch tabs button */}
              <Button
                variant="primary"
                onClick={handleFetchTabs}
                loading={fetchingTabs}
                icon={<Table2 className="w-4 h-4" />}
                fullWidth
              >
                {fetchingTabs ? "Fetching..." : "Fetch Available Tabs"}
              </Button>

              {/* Tab selector - only visible after fetching, tabs found */}
              {tabs.length > 0 && !useManualEntry && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Select Sheet Tab</label>
                  <div className="relative">
                    <select
                      value={selectedTab}
                      onChange={(e) => setSelectedTab(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white cursor-pointer"
                    >
                      {tabs.map((tab) => (
                        <option key={tab} value={tab}>{tab}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-400">{tabs.length} tab(s) found</p>

                  {showApiKeyHint && (
                    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                      <p className="font-semibold">⚠ Only the first sheet was detected.</p>
                      <p>
                        To see all worksheet tabs with their real names, set up a
                        free Google API key and add{" "}
                        <code className="bg-amber-100 px-1 rounded font-mono">GOOGLE_SHEETS_API_KEY</code>{" "}
                        to <code className="bg-amber-100 px-1 rounded font-mono">.env.local</code>.
                      </p>
                      <p>
                        Create one at{" "}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-800 underline font-medium"
                        >
                          Google Cloud Console
                        </a>{" "}
                        (free, no credit card needed).
                      </p>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={handleImportSheet}
                    icon={<Upload className="w-4 h-4" />}
                    fullWidth
                    className="mt-2"
                  >
                    Import from "{selectedTab}"
                  </Button>

                  <button
                    onClick={() => setUseManualEntry(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline cursor-pointer text-center mt-1"
                  >
                    Can't find your tab? Enter manually →
                  </button>
                </div>
              )}

              {/* Manual tab name entry - fallback when tabs can't be auto-detected or user clicks manual */}
              {(useManualEntry || (tabs.length === 0 && !fetchingTabs && !error)) && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    <span>Enter the sheet tab name manually, or leave blank to import the first tab.</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Tab Name (optional)</label>
                    <input
                      type="text"
                      value={manualTabName}
                      onChange={(e) => setManualTabName(e.target.value)}
                      placeholder='e.g. "Sheet1", "Campaign Data"'
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white"
                    />
                    <p className="text-xs text-slate-400">
                      Leave empty to import the first sheet (gid=0). Tabs are case-insensitive.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleImportSheet}
                    icon={<Upload className="w-4 h-4" />}
                    fullWidth
                  >
                    {manualTabName.trim() ? `Import from "${manualTabName.trim()}"` : "Import First Tab (gid=0)"}
                  </Button>

                  {tabs.length > 0 && (
                    <button
                      onClick={() => setUseManualEntry(false)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline cursor-pointer text-center"
                    >
                      ← Back to tab list
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-sm text-indigo-700">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{parsed.length} creator{parsed.length !== 1 ? "s" : ""}</strong> parsed from{" "}
                  <strong>{sourceTab === "csv" ? fileName : selectedTab}</strong>
                </span>
              </div>

              {/* Preview table */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Name", "Handle", "Phone", "Counter", "Agreed", "Links", "Status"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {parsed.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{c.name}</td>
                        <td className="px-3 py-2 text-slate-500">{c.handle}</td>
                        <td className="px-3 py-2 text-slate-500">{c.phone}</td>
                        <td className="px-3 py-2 text-slate-500">₹{c.target_budget.toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {c.locked_commercials === 0 ? "Barter (₹0)" : `₹${c.locked_commercials.toLocaleString()}`}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {c.reel_link ? "🎬 Reel" : c.profile_link ? "📸 Profile" : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { reset(); }} fullWidth>
                  Back
                </Button>
                <Button variant="primary" onClick={handleImport} fullWidth>
                  Import {parsed.length} Creator{parsed.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <p className="text-sm text-slate-600 font-medium">Importing creators…</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-slate-900">Import Successful!</p>
              <p className="text-sm text-slate-500">
                {parsed.length} creator{parsed.length !== 1 ? "s" : ""} added to your campaign.
              </p>
              <Button variant="primary" onClick={onClose} className="mt-2">
                View Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}