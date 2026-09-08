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

export function extractHandleFromProfile(value: string | undefined): string {
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

// ─── Gallery Import Parsing ────────────────────────────────────────────────────
// The gallery import is deliberately more lenient than the campaign CSV import:
// it extracts whatever profile links and contacts exist in a sheet, even when
// there is no dedicated header row or "Name" column.

export interface GalleryImportRow {
  name: string;
  handle: string;
  phone: string;
  profile_link: string | null;
}

/** Normalize a profile value into a full http(s) URL, or null if not a URL. */
function toProfileUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Bare instagram handles / domains like "instagram.com/user" or "@user"
  if (/^@/.test(trimmed)) return null;
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return `https://${trimmed}`;
  }
  return null;
}

/** True when a cell looks like a phone number (6–15 digits, no more than 2 letters). */
function looksLikePhone(cell: string): boolean {
  const trimmed = cell.trim();
  // Reject obvious dates like 2024-05-01 or 01/05/2024
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(trimmed)) return false;
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(trimmed)) return false;
  const digits = cell.replace(/\D/g, "");
  const letters = cell.replace(/[^A-Za-z]/g, "");
  return digits.length >= 6 && digits.length <= 15 && letters.length <= 2;
}

/** Fallback: scan every cell for an instagram / profile-style URL. */
function scanRowForProfile(row: Record<string, any>): string | null {
  for (const [key, value] of Object.entries(row)) {
    if (value == null) continue;
    const cell = String(value).trim();
    if (!cell) continue;
    const lower = cell.toLowerCase();
    if (
      lower.includes("instagram.com") ||
      lower.includes("ig.me") ||
      lower.includes("youtube.com") ||
      lower.includes("twitter.com") ||
      lower.includes("x.com") ||
      lower.includes("facebook.com") ||
      lower.includes("linkedin.com") ||
      lower.includes("threads.net")
    ) {
      const normKey = normalizeKey(key);
      // Skip cells that look like reel/video links from obvious columns
      if (normKey.includes("reel") || normKey.includes("video") || normKey.includes("live")) continue;
      return toProfileUrl(cell);
    }
  }
  return null;
}

/** Fallback: scan every cell for a phone-like value, skipping obvious non-contact columns. */
function scanRowForPhone(row: Record<string, any>): string {
  const ignored = ["budget", "price", "cost", "counter", "agreed", "commercial", "amount", "views", "followers", "reel", "link", "url", "date", "percent", "rate", "target", "locked", "final", "gross", "payout", "fee"];
  for (const [key, value] of Object.entries(row)) {
    if (value == null) continue;
    const cell = String(value).trim();
    if (!cell) continue;
    const normKey = normalizeKey(key);
    if (ignored.some((w) => normKey.includes(w))) continue;
    if (looksLikePhone(cell)) return cell.trim();
  }
  return "";
}

/**
 * Parse a CSV file (or raw CSV string) into gallery rows, keeping every row
 * that contains a profile link, handle, or phone number — no Name required.
 */
export function parseGalleryCSV(input: File | string): Promise<GalleryImportRow[]> {
  return new Promise((resolve, reject) => {
    const complete = (results: Papa.ParseResult<CSVRow>) => {
      const rows: GalleryImportRow[] = results.data.map((rawRow) => {
        const row = rawRow as unknown as Record<string, any>;

        const profile =
          findColumnValue(row, ["profile", "profilelink", "profile link", "instagram", "ig", "iglink", "insta", "social", "sociallink", "profileurl", "profile url", "link", "url"]) ||
          scanRowForProfile(row) ||
          undefined;
        const handle =
          findColumnValue(row, ["handle", "username", "instagramhandle", "igusername", "instagramid", "igid", "creatorhandle"]) ||
          extractHandleFromProfile(profile) ||
          "";
        const phone =
          findColumnValue(row, ["phone", "contact", "mobile", "whatsapp", "contactnumber", "contact number", "phonenumber", "phone number", "cell", "tel", "number"]) ||
          scanRowForPhone(row) ||
          "";
        const name =
          findColumnValue(row, ["name", "creator", "influencer", "creatorsname", "fullname", "full name"]) ||
          (handle ? `@${handle.replace(/^@/, "")}` : "") ||
          "Unknown";

        const profile_link = toProfileUrl(profile);

        return {
          name: name.trim(),
          handle: handle.replace(/^@/, "").trim(),
          phone: phone.trim(),
          profile_link,
        };
      });

      // Keep only rows that carry a profile link, handle, or phone
      const valid = rows.filter((r) => r.profile_link || r.handle || r.phone);
      resolve(dedupeGalleryRows(valid));
    };

    if (typeof input === "string") {
      Papa.parse<CSVRow>(input as string, {
        header: true,
        skipEmptyLines: true,
        complete,
        error: reject,
      });
    } else {
      Papa.parse<CSVRow>(input as File, {
        header: true,
        skipEmptyLines: true,
        complete,
        error: reject,
      });
    }
  });
}

/**
 * Resolve a row's identity: the profile username (from the handle column, or
 * extracted from the profile link) plus the contact phone digits.
 */
export function galleryRowIdentity(row: GalleryImportRow): {
  username: string;
  phone: string;
} {
  const username = extractHandleFromProfile(row.handle || row.profile_link || "")
    .toLowerCase()
    .replace(/^@/, "")
    .trim();
  const phone = row.phone.replace(/\D/g, "");
  return { username, phone };
}

/**
 * Deduplicate gallery rows. A row is considered a repeat of a previous one
 * when its profile username (from the handle or extracted from the profile
 * link) matches, or its contact phone matches.
 */
export function dedupeGalleryRows(rows: GalleryImportRow[]): GalleryImportRow[] {
  const seenUsernames = new Set<string>();
  const seenPhones = new Set<string>();
  const seenLinks = new Set<string>();

  const out: GalleryImportRow[] = [];
  for (const row of rows) {
    const { username, phone } = galleryRowIdentity(row);
    const link = row.profile_link
      ?.toLowerCase()
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "")
      .trim();

    if (
      (username && seenUsernames.has(username)) ||
      (phone && seenPhones.has(phone)) ||
      (link && seenLinks.has(link))
    ) {
      continue;
    }

    if (username) seenUsernames.add(username);
    if (phone) seenPhones.add(phone);
    if (link) seenLinks.add(link);

    out.push(row);
  }
  return out;
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

// ─── Export Campaign Data CSV (Sr No., Name, Profile Link, Reel Link) ──────

export function exportCampaignDataCSV(creators: Creator[]): void {
  const rows = creators.map((c, i) => {
    const cleanHandle = c.handle ? c.handle.replace(/^@/, "").trim() : "";
    const profileLink =
      c.profile_link ||
      (cleanHandle ? `https://www.instagram.com/${cleanHandle}/` : "");

    return {
      "Sr No.": i + 1,
      Name: c.name,
      "Profile Link": profileLink,
      "Reel Link": c.reel_link || "",
    };
  });

  const csv = Papa.unparse(rows);
  downloadCSV(csv, "campaign_data.csv");
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
