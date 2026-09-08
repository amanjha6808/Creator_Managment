"use client";

import { useState, useCallback, useRef } from "react";
import { GalleryImportRow, parseGalleryCSV, dedupeGalleryRows } from "@/lib/csv";
import { Button } from "@/components/ui/Button";
import { X, Upload, FileText, CheckCircle, AlertCircle, Globe, HelpCircle, Table2, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

interface GalleryImportResult {
  added: number;
  duplicates: number;
  total: number;
}

interface GalleryImportModalProps {
  onImport: (creators: GalleryImportRow[]) => Promise<GalleryImportResult>;
  onClose: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";
type SourceTab = "csv" | "sheets";

export function GalleryImportModal({ onImport, onClose }: GalleryImportModalProps) {
  const [sourceTab, setSourceTab] = useState<SourceTab>("csv");
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<GalleryImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GalleryImportResult | null>(null);

  // CSV state
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Google Sheets state
  const [sheetUrl, setSheetUrl] = useState("");
  const [fetchingTabs, setFetchingTabs] = useState(false);
  const [scannedTabs, setScannedTabs] = useState(0);
  const [tabErrors, setTabErrors] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setError(null);
    setFileName("");
    setSheetUrl("");
    setScannedTabs(0);
    setTabErrors([]);
    setShowHelp(false);
    setResult(null);
  };

  // ─── CSV handler ────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    setError(null);
    setFileName(file.name);
    try {
      const parsed = await parseGalleryCSV(file);
      if (parsed.length === 0) {
        setError("No profile links or contacts found. Make sure the CSV has columns like 'Profile Link' / 'Instagram' / 'Phone'.");
        return;
      }
      setRows(parsed);
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

  // ─── Google Sheets handler — scans ALL internal tabs ────────────────────────

  const handleImportAllTabs = async () => {
    if (!sheetUrl.trim()) {
      setError("Please enter a Google Sheets URL.");
      return;
    }

    setError(null);
    setFetchingTabs(true);
    setScannedTabs(0);
    setTabErrors([]);

    try {
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim(), action: "import-all" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch the spreadsheet.");
        return;
      }

      const tabs: { name: string; csvData: string }[] = data.tabs ?? [];
      if (tabs.length === 0) {
        setError("No data found in the spreadsheet.");
        return;
      }

      setScannedTabs(tabs.length);
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        setTabErrors(data.errors.map((e: any) => e.name));
      }

      // Parse every tab and merge the results
      let all: GalleryImportRow[] = [];
      for (const tab of tabs) {
        if (!tab.csvData || !tab.csvData.trim()) continue;
        const parsed = await parseGalleryCSV(tab.csvData);
        all = all.concat(parsed);
      }

      const deduped = dedupeGalleryRows(all);
      if (deduped.length === 0) {
        setError("No profile links or contacts found in any tab of the spreadsheet.");
        setStep("upload");
        return;
      }

      setRows(deduped);
      setStep("preview");
    } catch {
      setError("Failed to import the spreadsheet. Please check the URL and try again.");
    } finally {
      setFetchingTabs(false);
    }
  };

  // ─── Import into gallery pool ───────────────────────────────────────────────

  const handleImport = async () => {
    setStep("importing");
    setError(null);
    try {
      const res = await onImport(rows);
      setResult(res);
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Import failed. Please try again.");
      setStep("preview");
    }
  };

  const sourceLabel = sourceTab === "csv" ? fileName : `spreadsheet (${scannedTabs} tab${scannedTabs !== 1 ? "s" : ""})`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import to Gallery</h2>
              <p className="text-xs text-slate-400">Add profile links & contacts to the creator pool</p>
            </div>
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
                    Extracts profile links (Instagram, YouTube, X, etc.) and phone / WhatsApp contacts from any column.
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
            </div>
          )}

          {step === "upload" && sourceTab === "sheets" && (
            <div className="flex flex-col gap-4">
              {/* Sheet URL input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Google Sheets URL</label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => { setSheetUrl(e.target.value); setError(null); }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white transition-all"
                />
              </div>

              <Button
                variant="primary"
                onClick={handleImportAllTabs}
                loading={fetchingTabs}
                icon={<Table2 className="w-4 h-4" />}
                fullWidth
              >
                {fetchingTabs ? "Scanning all tabs…" : "Scan Entire Spreadsheet (All Tabs)"}
              </Button>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-sm text-indigo-700">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Imports every worksheet tab in the spreadsheet and pulls out profile links and contacts from each one.
                </span>
              </div>

              <button
                onClick={() => setShowHelp((v) => !v)}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline cursor-pointer text-left"
              >
                {showHelp ? "Hide setup notes" : "Sheet not accessible? Setup notes →"}
              </button>

              {showHelp && (
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <p className="font-semibold">⚠ Make sure your sheet is shareable.</p>
                  <p>
                    The sheet must be shared with <strong>Anyone with the link</strong> (Viewer is enough) so the app can read it.
                    For reliable detection of all internal tabs, add a free Google API key{" "}
                    <code className="bg-amber-100 px-1 rounded font-mono">GOOGLE_SHEETS_API_KEY</code> to{" "}
                    <code className="bg-amber-100 px-1 rounded font-mono">.env.local</code> — create one at{" "}
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

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ─── Preview Step ──────────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-sm text-indigo-700">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{rows.length} creator{rows.length !== 1 ? "s" : ""}</strong> found with profile links or contacts
                  {sourceTab === "sheets" && scannedTabs > 0 && (
                    <> across <strong>{scannedTabs} tab{scannedTabs !== 1 ? "s" : ""}</strong></>
                  )}
                </span>
              </div>

              {tabErrors.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Could not read {tabErrors.length} tab{tabErrors.length !== 1 ? "s" : ""}: {tabErrors.join(", ")}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Duplicates are skipped automatically — existing gallery creators won't be re-added.</span>
              </div>

              {/* Preview table */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Name", "Handle", "Phone", "Profile Link"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800 max-w-[140px] truncate">{r.name}</td>
                        <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">{r.handle ? `@${r.handle}` : "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.phone || "—"}</td>
                        <td className="px-3 py-2 text-indigo-600 max-w-[180px] truncate">
                          {r.profile_link ? (
                            <a href={r.profile_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {r.profile_link}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && (
                  <p className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100">
                    Showing first 50 of {rows.length} rows.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={reset} fullWidth>
                  Back
                </Button>
                <Button variant="primary" onClick={handleImport} fullWidth>
                  Add {rows.length} Creator{rows.length !== 1 ? "s" : ""} to Gallery
                </Button>
              </div>
            </div>
          )}

          {/* ─── Importing Step ────────────────────────────────────────────── */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <p className="text-sm text-slate-600 font-medium">Adding to gallery pool…</p>
              <p className="text-xs text-slate-400">Checking duplicates and saving contacts.</p>
            </div>
          )}

          {/* ─── Done Step: popup summary of the bulk upload ─────────────────── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Bulk Upload Complete</p>
                <p className="text-xs text-slate-400 mt-1">
                  Repeated profiles were matched by contact or profile username and skipped.
                </p>
              </div>

              {/* Summary popup: done vs repeated */}
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Done (added)
                  </span>
                  <span className="text-xl font-bold text-emerald-800">{result?.added ?? 0}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Repeated (skipped)
                  </span>
                  <span className="text-xl font-bold text-amber-800">{result?.duplicates ?? 0}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-xs font-medium text-slate-600">Found in {sourceLabel}</span>
                  <span className="text-sm font-bold text-slate-700">{result?.total ?? 0}</span>
                </div>
              </div>

              <Button variant="primary" onClick={onClose} className="mt-1">
                View Gallery
              </Button>
            </div>
          )}

          {step !== "upload" && step !== "importing" && step !== "done" && error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 mt-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}