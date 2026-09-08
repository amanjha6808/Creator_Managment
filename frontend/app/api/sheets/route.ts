import { NextRequest, NextResponse } from "next/server";

// ─── Google Sheets URL parsing ─────────────────────────────────────────────────

function extractSheetId(url: string): string | null {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractGid(url: string): string | null {
  const m = url.match(/[?&]gid=(\d+)/);
  return m?.[1] ?? null;
}

// ─── Fetch helper with timeout ─────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── Sheet Tab Listing via Google Sheets API v4 ────────────────────────────────
// Uses GOOGLE_SHEETS_API_KEY env var. This is the ONLY reliable way to get
// real worksheet tab names from a Google Sheets spreadsheet.

async function listSheetTabsViaApi(
  sheetId: string,
  apiKey: string,
): Promise<{ tabs: string[]; gids: Record<string, string> } | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties.title,sheets.properties.sheetId`;
  const res = await fetchWithTimeout(url);
  if (!res || !res.ok) return null;

  const data: { sheets?: { properties?: { title?: string; sheetId?: number } }[] } =
    await res.json().catch(() => ({}));
  if (!data.sheets || data.sheets.length === 0) return null;

  const tabs: string[] = [];
  const gids: Record<string, string> = {};
  for (const s of data.sheets) {
    const title = s.properties?.title;
    const gid = s.properties?.sheetId?.toString();
    if (title) {
      tabs.push(title);
      if (gid) gids[title] = gid;
    }
  }
  return tabs.length > 0 ? { tabs, gids } : null;
}

// ─── Fallback: Probe via CSV export — finds tabs but uses generic names ─────────
// Used only when no API key is configured.

async function listSheetTabsViaProbing(sheetId: string): Promise<{
  tabs: string[];
  gids: Record<string, string>;
}> {
  const foundTabs: string[] = [];
  const foundGids: Record<string, string> = {};
  const seenContent = new Set<string>();

  // Google Sheets uses sequential gid values (0, 1, 2, …) for sheets in order
  // when sheets are added sequentially, OR large random-looking numbers.
  // Try sequential 0..50 first, then also try extracting from the HTML.
  for (let gid = 0; gid <= 50; gid++) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const res = await fetchWithTimeout(csvUrl);
      if (res && res.ok) {
        const text = await res.text().catch(() => "");
        if (text && text.trim().length > 0) {
          const key = text.trim().substring(0, 80);
          if (!seenContent.has(key)) {
            seenContent.add(key);
            const name = `Sheet${foundTabs.length + 1}`;
            foundTabs.push(name);
            foundGids[name] = gid.toString();
          }
        }
      }
    } catch {
      continue;
    }
  }

  return { tabs: foundTabs, gids: foundGids };
}

// ─── Import data from a specific sheet tab via CSV export ──────────────────────

async function importSheetData(sheetId: string, gid: string): Promise<string> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetchWithTimeout(csvUrl);
  if (!res || !res.ok) {
    // Try without gid (default sheet)
    const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const fallbackRes = await fetchWithTimeout(fallbackUrl);
    if (!fallbackRes || !fallbackRes.ok) {
      throw new Error(
        "Failed to fetch sheet data. Make sure the sheet is shared with 'Anyone with the link' or published to the web."
      );
    }
    const text = await fallbackRes.text().catch(() => "");
    if (!text || text.trim().length === 0) throw new Error("The sheet tab is empty.");
    return text;
  }
  const text = await res.text().catch(() => "");
  if (!text || text.trim().length === 0) throw new Error("The sheet tab is empty.");
  return text;
}

// ─── Validate Google Sheets URL ────────────────────────────────────────────────

function validateSheetUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Please provide a Google Sheets URL." };
  }
  if (!url.includes("docs.google.com/spreadsheets") && !url.includes("sheets.google.com")) {
    return {
      valid: false,
      error:
        'Invalid Google Sheets URL. URL must be from docs.google.com/spreadsheets.\n\n' +
        'Example: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit',
    };
  }
  const id = extractSheetId(url);
  if (!id) {
    return { valid: false, error: "Could not extract spreadsheet ID from the URL." };
  }
  return { valid: true };
}

// ── CORS headers for cross-origin dev access ──────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

// ─── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.url) {
      return NextResponse.json({ error: "Request body must include a 'url' field." }, { status: 400, headers: CORS_HEADERS });
    }

    const { url, action, tabName } = body;

    // Validate URL
    const validation = validateSheetUrl(url);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400, headers: CORS_HEADERS });
    }

    const sheetId = extractSheetId(url)!;
    const urlGid = extractGid(url);
    const apiKey = (process.env.GOOGLE_SHEETS_API_KEY || "").trim();

    if (action === "list-tabs") {
      let result: { tabs: string[]; gids: Record<string, string> } | null = null;

      // Strategy 1: Google Sheets API v4 with API key (REAL tab names)
      if (apiKey) {
        result = await listSheetTabsViaApi(sheetId, apiKey);
      }

      // Strategy 2: Probing via CSV export (generic names, works without API key)
      if (!result || result.tabs.length === 0) {
        result = await listSheetTabsViaProbing(sheetId);
      }

      if (!result || result.tabs.length === 0) {
        return NextResponse.json({
          success: false,
          tabs: [],
          gids: {},
          sheetId,
          urlGid,
          needsApiKey: !apiKey,
          message: !apiKey
            ? "No tabs found. For proper tab name detection, set GOOGLE_SHEETS_API_KEY in .env.local. You can create a free API key at https://console.cloud.google.com/apis/credentials"
            : "No tabs found. Make sure the sheet is shared with 'Anyone with the link'.",
        }, { headers: CORS_HEADERS });
      }

      return NextResponse.json({
        success: true,
        tabs: result.tabs,
        gids: result.gids,
        sheetId,
        urlGid,
        needsApiKey: !apiKey,
      }, { headers: CORS_HEADERS });
    }

    if (action === "import") {
      // Resolve gid: from tabName lookup > url-embedded > default (0)
      let gid = "0";

      if (tabName) {
        // Try to find the tab name via API first
        if (apiKey) {
          const apiResult = await listSheetTabsViaApi(sheetId, apiKey);
          if (apiResult && apiResult.tabs.length > 0) {
            const match = apiResult.tabs.find(
              (t) => t.toLowerCase() === tabName.toLowerCase()
            );
            if (match && apiResult.gids[match]) {
              gid = apiResult.gids[match];
            }
          }
        }

        // If API didn't resolve, try probing
        if (gid === "0") {
          const probeResult = await listSheetTabsViaProbing(sheetId);
          const match = probeResult.tabs.find(
            (t) => t.toLowerCase() === tabName.toLowerCase()
          );
          if (match && probeResult.gids[match]) {
            gid = probeResult.gids[match];
          }
        }
      } else {
        gid = urlGid || "0";
      }

      const csvData = await importSheetData(sheetId, gid);
      return NextResponse.json({ success: true, csvData, gid }, { headers: CORS_HEADERS });
    }

    if (action === "import-all") {
      // Scan EVERY worksheet tab in the spreadsheet and pull CSV data from each.
      let tabsInfo: { tabs: string[]; gids: Record<string, string> } | null = null;

      // Strategy 1: Google Sheets API v4 with API key (REAL tab names)
      if (apiKey) {
        tabsInfo = await listSheetTabsViaApi(sheetId, apiKey);
      }

      // Strategy 2: Probing via CSV export (generic names, works without API key)
      if (!tabsInfo || tabsInfo.tabs.length === 0) {
        tabsInfo = await listSheetTabsViaProbing(sheetId);
      }

      if (!tabsInfo || tabsInfo.tabs.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No sheet tabs found. Make sure the sheet is shared with 'Anyone with the link' " +
              "(or set GOOGLE_SHEETS_API_KEY in .env.local for reliable tab detection).",
            needsApiKey: !apiKey,
          },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      const tabs: { name: string; csvData: string }[] = [];
      const errors: { name: string; error: string }[] = [];

      for (const tab of tabsInfo.tabs) {
        const gid = tabsInfo.gids[tab] ?? "0";
        try {
          const csvData = await importSheetData(sheetId, gid);
          tabs.push({ name: tab, csvData });
        } catch (err: any) {
          errors.push({ name: tab, error: err?.message || "Failed to fetch this tab." });
        }
      }

      if (tabs.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Could not read any sheet tab. " + (errors[0]?.error || ""),
          },
          { status: 500, headers: CORS_HEADERS },
        );
      }

      return NextResponse.json(
        {
          success: true,
          tabs,
          tabCount: tabs.length,
          errors: errors.length > 0 ? errors : undefined,
          needsApiKey: !apiKey,
        },
        { headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'list-tabs', 'import', or 'import-all'." },
      { status: 400, headers: CORS_HEADERS },
    );
  } catch (err: any) {
    console.error("[Sheets API]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process Google Sheets request." },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}