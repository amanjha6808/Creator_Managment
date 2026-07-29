import Papa from "papaparse";
import { Creator, CreatorCreate, CSVRow, CreatorStatus } from "./types";

// ─── Flexible Column Resolution & Parsing Helpers ───────────────────────────

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Remove any columns whose name contains "standard" (case-insensitive).
 *  These are often "Standard Commercial" or similar pricing columns that
 *  should NOT be used for budget / target / counter matching. */
function withoutStandardColumns(row: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !normalizeKey(key).includes("standard"))
  );
}

function findColumnValue(row: Record<string, any>, candidates: string[]): string | undefined {
  const rowKeys = Object.keys(row);
  const normalizedRowKeys = rowKeys.map((k) => ({
    original: k,
    norm: normalizeKey(k),
  }));

  for (const candidate of candidates) {
    const normCandidate = normalizeKey(candidate);

    // 1. Exact normalized match
    for (const item of normalizedRowKeys) {
      if (item.norm === normCandidate) {
        const val = row[item.original];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return String(val).trim();
        }
      }
    }

    // 2. Partial match
    for (const item of normalizedRowKeys) {
      if (item.norm.includes(normCandidate) || normCandidate.includes(item.norm)) {
        const val = row[item.original];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return String(val).trim();
        }
      }
    }
  }

  return undefined;
}

function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  const str = val.trim().toLowerCase();
  if (
    str === "barter" ||
    str.includes("barter") ||
    str === "nil" ||
    str === "n/a" ||
    str === "na" ||
    str === "1200"
  ) {
    return 0;
  }
  const cleaned = str.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeStatus(value: string | undefined): CreatorStatus {
  const raw = value?.trim() || "";
  if (raw === "") return "Pending";
  const normalized = raw.toLowerCase();

  if (normalized.includes("draft") || normalized.includes("pending") || normalized === "n/a" || normalized === "na") {
    return "Pending";
  }
  if (normalized.includes("live")) return "Live";
  if (normalized.includes("contact")) return "Contacted";
  if (normalized.includes("negotiation")) return "In Negotiation";
  if (normalized.includes("confirm")) return "Confirmed";
  if (normalized.includes("drop")) return "Dropped";

  return (raw as CreatorStatus) || "Pending";
}

function extractHandleFromProfile(value: string | undefined): string {
  if (!value) return "";
  const cleaned = value.trim();
  const atMatch = cleaned.match(/@([A-Za-z0-9_.]+)/);
  if (atMatch) return atMatch[1];

  const url = cleaned.replace(/^https?:\/\//i, "");
  const parts = url.split(/[/?#]+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts[0].toLowerCase().includes("instagram.com") && parts.length > 1) {
    return parts[1];
  }
  return parts[parts.length - 1];
}

function normalizeBudget(value: string | undefined): number {
  if (!value) return 0;
  return parseAmount(value);
}

// ─── Parse CSV file into CreatorCreate[] ──────────────────────────────────────

export function parseCSVFile(file: File): Promise<CreatorCreate[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const creators: CreatorCreate[] = results.data.map((row, index) => {
          // Strip out any column whose name contains "Standard" — these are
          // pricing / rate-card columns (e.g. "Standard Commercial") that must
          // NOT be confused with the creator's target budget or counter budget.
          const cleanRow = withoutStandardColumns(row);

          const name = findColumnValue(cleanRow, ["name", "creator", "influencer"]) || "Unknown";
          const phone = findColumnValue(cleanRow, ["phone", "contact", "mobile", "whatsapp", "contactnumber"]) || "";
          const profile = findColumnValue(cleanRow, ["profile", "profilelink", "profile link", "instagram", "ig", "iglink"]);
          const handle =
            findColumnValue(cleanRow, ["handle", "username", "instagramhandle", "igusername"]) ||
            extractHandleFromProfile(profile) ||
            "";

          const budgetValue = findColumnValue(cleanRow, [
            "counter",
            "counterbudget",
            "counter_budget",
            "counter budget",
            "targetbudget",
            "target budget",
            "budget",
            "target",
          ]);
          const agreedValue = findColumnValue(cleanRow, [
            "agreed",
            "counterprice",
            "counter price",
            "finalagreed",
            "final_and_agreed",
            "final agreed",
            "lockedcommercials",
            "locked commercials",
          ]);
          const collabType = findColumnValue(cleanRow, ["collabtype", "collab type", "collaboration type"]);
          const rawStatus = findColumnValue(cleanRow, ["status", "stage", "draft status", "draftstatus"]);
          const reelValue = findColumnValue(cleanRow, ["reel_link", "live link", "reel link", "video link"]);
          const profileLinkValue = profile || undefined;

          const cleanHandle = handle.replace(/^@/, "").trim();

          let reel_link: string | null = null;
          if (reelValue) {
            reel_link = reelValue.startsWith("http") ? reelValue : `https://${reelValue}`;
          }

          let profile_link: string | null = null;
          if (profileLinkValue) {
            profile_link = profileLinkValue.startsWith("http") ? profileLinkValue : `https://${profileLinkValue}`;
          }
          if (!profile_link && cleanHandle) {
            profile_link = `https://www.instagram.com/${cleanHandle}/`;
          }

          const target_budget = normalizeBudget(budgetValue);
          const counter_budget = normalizeBudget(budgetValue);
          // If agreed cell is empty / NA / barter → set to target_budget so savings = 0
          const isAgreedEmpty = !agreedValue || ["na", "n/a", "nil", "barter"].includes(agreedValue.trim().toLowerCase());
          const locked_commercials = isAgreedEmpty ? target_budget : normalizeBudget(agreedValue);
          const final_agreed = isAgreedEmpty ? target_budget : normalizeBudget(agreedValue);
          const status = normalizeStatus(rawStatus || "");

          return {
            name,
            phone,
            handle: cleanHandle,
            target_budget,
            locked_commercials,
            reel_link,
            profile_link,
            status,
            final_agreed,
            counter_budget,
            collab_type: collabType || undefined,
          };
        });
        resolve(creators);
      },
      error: reject,
    });
  });
}

// ─── Format number as Indian Rupees ───────────────────────────────────────────

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Format large numbers (views) ─────────────────────────────────────────────

export function formatCount(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "NA";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── Generate Campaign Performance CSV ───────────────────────────────────────

export function exportCommercialSavingsCSV(creators: Creator[]): void {
  const rows = creators.map((c) => {
    const savings = (Number(c.target_budget) || 0) - (Number(c.locked_commercials) || 0);
    const savingsPct = (Number(c.target_budget) || 0) > 0 ? ((savings / (Number(c.target_budget) || 0)) * 100).toFixed(1) : "0.0";
    return {
      Name: c.name,
      Handle: c.handle,
      "Counter Budget": c.target_budget,
      "Final and Agreed": c.locked_commercials,
      "Savings (₹)": savings,
      "Savings %": `${savingsPct}%`,
    };
  });

  const csv = Papa.unparse(rows);
  downloadCSV(csv, "commercial_savings.csv");
}

// ─── Sample CSV Template ──────────────────────────────────────────────────────

export function downloadSampleCSV(): void {
  const sample = [
    {
      Name: "Priya Sharma",
      Phone: "919876543210",
      Handle: "@priyasharma",
      Counter: "50000",
      "Final and Agreed": "42000",
      "Reel Link": "https://www.instagram.com/reel/ABC123/",
      "Profile Link": "https://www.instagram.com/priyasharma/",
      Status: "Confirmed",
    },
    {
      Name: "Ravi Kumar",
      Phone: "919988776655",
      Handle: "@ravikumar",
      Counter: "30000",
      "Final and Agreed": "1200",
      "Reel Link": "",
      "Profile Link": "https://www.instagram.com/ravikumar/",
      Status: "Contacted",
    },
  ];
  const csv = Papa.unparse(sample);
  downloadCSV(csv, "creators_template.csv");
}

// ─── Utility: trigger browser download ────────────────────────────────────────

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
