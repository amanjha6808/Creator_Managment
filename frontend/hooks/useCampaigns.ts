"use client";

import { useState, useCallback, useEffect } from "react";
import { Creator, CreatorCreate, CreatorUpdate, CampaignSummary } from "@/lib/types";
import { GalleryImportRow, extractHandleFromProfile } from "@/lib/csv";
import { generateId } from "@/lib/id";

export interface Campaign {
  id: string;
  name: string;
  created_at: string;
  creators: Creator[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = "/api";

/** Strip currency symbols, commas, and whitespace; return a clean number. */
function parseCurrencyNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-") return 0;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

async function api<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Forward the login_id so API routes can scope queries
  if (typeof window !== "undefined") {
    const loginId = localStorage.getItem("login_id");
    if (loginId) headers["x-login-id"] = loginId;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options,
  });

  // Session expired — redirect to login
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("login_id");
    window.location.href = "/login";
    throw new Error("Session expired. Redirecting to login…");
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new Error(`API error ${res.status} — could not parse response`);
  }
  if (!res.ok) throw new Error(body?.error || `API error ${res.status}`);
  return body as T;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ─── Load campaigns from API on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setApiError(null);
        const json = await api<{ campaigns: any[] }>("/campaigns");

        if (cancelled) return;

        // If no campaigns exist, create a default one
        if (json.campaigns.length === 0) {
          const created = await api<{ campaign: any }>("/campaigns", {
            method: "POST",
            body: JSON.stringify({ name: "Main Campaign" }),
          });
          if (cancelled) return;
          const defaultCamp: Campaign = {
            ...created.campaign,
            creators: [],
          };
          setCampaigns([defaultCamp]);
          setActiveCampaignId(defaultCamp.id);
        } else {
          // Fetch creators for every campaign in parallel
          const withCreators = await Promise.all(
            json.campaigns.map(async (c: any) => {
              try {
                const crJson = await api<{ creators: any[] }>(
                  `/campaigns/${c.id}/creators`,
                );
                return { ...c, creators: crJson.creators ?? [] } as Campaign;
              } catch {
                return { ...c, creators: [] } as Campaign;
              }
            }),
          );
          if (cancelled) return;
          setCampaigns(withCreators);
          setActiveCampaignId(withCreators[0].id);
        }
        setHydrated(true);
      } catch (err: any) {
        if (!cancelled) {
          console.error("[useCampaigns] Failed to load campaigns:", err);
          setApiError(err.message);
          setHydrated(true); // still mark as hydrated so UI renders
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ─── Re-fetch all campaigns and their creators ────────────────────────────
  const reloadCampaigns = useCallback(async () => {
    try {
      const json = await api<{ campaigns: any[] }>("/campaigns");
      if (json.campaigns.length === 0) {
        setCampaigns([]);
        setActiveCampaignId("");
        return;
      }
      const withCreators = await Promise.all(
        json.campaigns.map(async (c: any) => {
          try {
            const crJson = await api<{ creators: any[] }>(
              `/campaigns/${c.id}/creators`,
            );
            return { ...c, creators: crJson.creators ?? [] } as Campaign;
          } catch {
            return { ...c, creators: [] } as Campaign;
          }
        }),
      );
      setCampaigns(withCreators);
      setActiveCampaignId((prev) =>
        withCreators.some((c) => c.id === prev) ? prev : withCreators[0].id,
      );
    } catch (err: any) {
      console.error("[useCampaigns] Failed to reload campaigns:", err);
    }
  }, []);

  // ─── Re-fetch creators for the currently active campaign ─────────────────
  const refreshActiveCreators = useCallback(
    async (campaignsList: Campaign[]) => {
      const active = campaignsList.find((c) => c.id === activeCampaignId);
      if (!active) return campaignsList;
      try {
        const json = await api<{ creators: any[] }>(
          `/campaigns/${active.id}/creators`,
        );
        return campaignsList.map((c) =>
          c.id === active.id ? { ...c, creators: json.creators } : c,
        );
      } catch {
        return campaignsList;
      }
    },
    [activeCampaignId],
  );

  // ─── Derived state ───────────────────────────────────────────────────────
  const activeCampaign: Campaign =
    campaigns.find((c) => c.id === activeCampaignId) ||
    campaigns[0] || { id: "", name: "Loading...", created_at: "", creators: [] };

  const creators = activeCampaign
    ? activeCampaign.creators.filter((c) => !c.removed_reason)
    : [];

  const removedCreators = campaigns
    .flatMap((c) => c.creators.filter((cr) => cr.removed_reason))
    .map((cr) => {
      const camp = campaigns.find((c) =>
        c.creators.some((cc) => cc.id === cr.id),
      );
      return { ...cr, _campaignName: camp?.name ?? "Unknown" };
    });

  const allCreatorsAcrossCampaigns = campaigns.flatMap((c) =>
    c.creators.filter((cr) => !cr.removed_reason),
  );

  // ─── Campaign CRUD ───────────────────────────────────────────────────────

  const createCampaign = useCallback(
    async (name: string) => {
      const json = await api<{ campaign: any }>("/campaigns", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() || `Campaign ${campaigns.length + 1}` }),
      });
      const newCamp: Campaign = { ...json.campaign, creators: [] };
      setCampaigns((prev) => [newCamp, ...prev]);
      setActiveCampaignId(newCamp.id);
      setSelected(new Set());
      return newCamp;
    },
    [campaigns.length],
  );

  const deleteCampaign = useCallback(
    async (id: string) => {
      await api(`/campaigns/${id}`, { method: "DELETE" });
      setCampaigns((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (next.length === 0) {
          // Create a new default campaign if this was the last one
          createCampaign("Main Campaign");
          return prev; // will be updated by the createCampaign call
        }
        if (activeCampaignId === id) {
          setActiveCampaignId(next[0].id);
        }
        return next;
      });
      setSelected(new Set());
    },
    [activeCampaignId, createCampaign],
  );

  const switchCampaign = useCallback((id: string) => {
    setActiveCampaignId(id);
    setSelected(new Set());
  }, []);

  // ─── Creator Management ──────────────────────────────────────────────────

  const sanitizeIncomingRows = useCallback((incoming: any[]) => {
    return incoming
      .filter((c) => {
        const name = c.name || c.Name;
        const handle = c.handle || c.Handle || c.profile_link || c.profileLink;
        return name?.toString().trim() && handle?.toString().trim();
      })
      .map((row: any) => {
        const budget = parseCurrencyNumber(
          row.counter_budget ?? row.Counter_budget
            ?? row.counter ?? row.Counter
            ?? row.target_budget ?? row.targetBudget ?? row.Target_Budget
            ?? 0,
        );
        const agreed = parseCurrencyNumber(
          row.final_agreed ?? row.final_and_agreed
            ?? row.Final_Agreed ?? row.Final_And_Agreed
            ?? row.agreed ?? row.Agreed
            ?? row.locked_commercials ?? row.lockedCommercials
            ?? 0,
        );

        return {
          name: (row.name ?? row.Name ?? "").toString().trim(),
          phone: (row.phone ?? row.Phone ?? row.phone_number ?? row.Contact ?? "").toString().trim(),
          handle: (row.handle ?? row.Handle ?? row.profile_link ?? "").toString().replace(/^@/, "").trim(),
          target_budget: budget,
          locked_commercials: agreed,
          counter_budget: budget,
          final_agreed: agreed,
          reel_link: row.reel_link ?? row.Reel_Link ?? row.reelLink ?? row["Reel Link"] ?? row["Live Link"] ?? null,
          profile_link: row.profile_link ?? row.Profile_Link ?? row.profileLink ?? null,
          status: row.status ?? row.Status ?? "Pending",
          collab_type: row.collab_type ?? row.Collab_Type ?? null,
        };
      });
  }, []);

  const replaceCreatorsWithSheet = useCallback(
    async (incoming: any[]) => {
      if (!activeCampaign.id) return;

      const valid = sanitizeIncomingRows(incoming);

      const { creators: saved } = await api<{ creators: any[] }>(
        `/campaigns/${activeCampaign.id}/creators`,
        {
          method: "PUT",
          body: JSON.stringify({ creators: valid }),
        },
      );
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === activeCampaign.id ? { ...c, creators: saved } : c,
        ),
      );
      setSelected(new Set());
    },
    [activeCampaign.id, sanitizeIncomingRows],
  );

  /** Append creators to the active campaign, skipping duplicates by handle. */
  const appendCreatorsToSheet = useCallback(
    async (incoming: any[]): Promise<{ added: number; duplicates: number; total: number }> => {
      if (!activeCampaign.id) return { added: 0, duplicates: 0, total: 0 };

      const valid = sanitizeIncomingRows(incoming);

      // Build identity sets from existing creators: profile username
      // (handle or extracted from the profile link) and contact phone.
      const existingUsernames = new Set<string>();
      const existingPhones = new Set<string>();
      for (const c of activeCampaign.creators.filter((cr) => !cr.removed_reason)) {
        const username = extractHandleFromProfile(c.handle || c.profile_link || "")
          .toLowerCase()
          .replace(/^@/, "")
          .trim();
        const phone = (c.phone ?? "").replace(/\D/g, "");
        if (username) existingUsernames.add(username);
        if (phone) existingPhones.add(phone);
      }

      // Skip repeated profiles: same username (from handle or profile link) or same phone
      const newCreators = valid.filter((c) => {
        const username = extractHandleFromProfile(c.handle || c.profile_link || "")
          .toLowerCase()
          .replace(/^@/, "")
          .trim();
        const phone = (c.phone ?? "").replace(/\D/g, "");
        if (username && existingUsernames.has(username)) return false;
        if (phone && existingPhones.has(phone)) return false;
        return true;
      });
      const duplicates = valid.length - newCreators.length;

      // Insert each new creator individually via the POST endpoint
      for (const creator of newCreators) {
        await api<{ creator: any }>("/creators", {
          method: "POST",
          body: JSON.stringify({ ...creator, campaign_id: activeCampaign.id }),
        });
      }

      // Refresh the campaign's creators
      const json = await api<{ creators: any[] }>(
        `/campaigns/${activeCampaign.id}/creators`,
      );
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === activeCampaign.id ? { ...c, creators: json.creators } : c,
        ),
      );
      setSelected(new Set());

      return { added: newCreators.length, duplicates, total: valid.length };
    },
    [activeCampaign.id, sanitizeIncomingRows],
  );

  const addCreator = useCallback(
    async (data: CreatorCreate) => {
      if (!activeCampaign.id) throw new Error("No active campaign");
      if (!data.name?.trim() || !data.handle?.trim()) {
        throw new Error("Name and Instagram ID are required.");
      }
      const { creator } = await api<{ creator: any }>("/creators", {
        method: "POST",
        body: JSON.stringify({ ...data, campaign_id: activeCampaign.id }),
      });
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === activeCampaign.id
            ? { ...c, creators: [...c.creators, creator] }
            : c,
        ),
      );
      return creator;
    },
    [activeCampaign.id],
  );

  const updateCreator = useCallback(
    async (id: string, data: CreatorUpdate) => {
      await api(`/creators/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setCampaigns((prev) =>
        prev.map((camp) => ({
          ...camp,
          creators: camp.creators.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        })),
      );
    },
    [],
  );

  const removeCreator = useCallback(
    async (id: string, reason?: string) => {
      const now = new Date().toISOString();
      await api(`/creators/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          removed_reason: reason ?? "No reason provided",
          removed_at: now,
        }),
      });
      setCampaigns((prev) =>
        prev.map((camp) => ({
          ...camp,
          creators: camp.creators.map((c) =>
            c.id === id
              ? { ...c, removed_reason: reason ?? "No reason provided", removed_at: now }
              : c,
          ),
        })),
      );
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [],
  );

  // ─── Selection ───────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(creators.map((c) => c.id)));
  }, [creators]);

  const deselectAll = useCallback(() => setSelected(new Set()), []);

  // ─── Summary ─────────────────────────────────────────────────────────────

  const summary: CampaignSummary = {
    totalAllocated: creators.reduce((s, c) => s + (Number(c.target_budget) || 0), 0),
    totalSpent: creators.reduce((s, c) => s + (Number(c.locked_commercials) || 0), 0),
    netSavings: creators.reduce(
      (s, c) => s + ((Number(c.target_budget) || 0) - (Number(c.locked_commercials) || 0)),
      0,
    ),
    creatorCount: creators.length,
    liveCount: creators.filter((c) => c.status === "Live").length,
  };

  /** Sync missing contacts across campaigns by matching profile_link or handle. */
  const syncContacts = useCallback(
    async (): Promise<{ updated: number; notFound: number; skipped: number }> => {
      let updated = 0;
      let notFound = 0;
      let skipped = 0;

      // Build a lookup of all creators with non-empty phones, keyed by profile_link and handle
      const phoneLookupByLink = new Map<string, string>();
      const phoneLookupByHandle = new Map<string, string>();

      for (const cr of allCreatorsAcrossCampaigns) {
        if (!cr.phone || cr.phone.trim() === "") continue;
        const cleanPhone = cr.phone.replace(/\D/g, "");
        if (!cleanPhone) continue;

        const link = cr.profile_link?.trim().toLowerCase();
        if (link) phoneLookupByLink.set(link, cr.phone);

        const handle = cr.handle?.trim().toLowerCase().replace(/^@/, "");
        if (handle) phoneLookupByHandle.set(handle, cr.phone);
      }

      // Find creators in active campaign with missing phones and try to fill them
      for (const cr of activeCampaign.creators) {
        if (cr.removed_reason) { skipped++; continue; }
        if (cr.phone && cr.phone.replace(/\D/g, "").length >= 5) { skipped++; continue; }

        // Try matching by profile_link first, then by handle
        let foundPhone: string | null = null;

        const link = cr.profile_link?.trim().toLowerCase();
        if (link && phoneLookupByLink.has(link)) {
          foundPhone = phoneLookupByLink.get(link)!;
        }

        if (!foundPhone) {
          const handle = cr.handle?.trim().toLowerCase().replace(/^@/, "");
          if (handle && phoneLookupByHandle.has(handle)) {
            foundPhone = phoneLookupByHandle.get(handle)!;
          }
        }

        if (foundPhone) {
          await updateCreator(cr.id, { phone: foundPhone });
          updated++;
        } else {
          notFound++;
        }
      }

      return { updated, notFound, skipped };
    },
    [activeCampaign.creators, allCreatorsAcrossCampaigns, updateCreator],
  );

  /** Bulk-import profile links & contacts into the gallery pool, then refresh. */
  const importGallery = useCallback(
    async (rows: GalleryImportRow[]) => {
      const res = await api<{
        added: number;
        duplicates: number;
        total: number;
        creators: any[];
      }>("/gallery", {
        method: "POST",
        body: JSON.stringify({ creators: rows }),
      });
      await reloadCampaigns();
      return { added: res.added, duplicates: res.duplicates, total: res.total };
    },
    [reloadCampaigns],
  );

  return {
    campaigns,
    activeCampaign,
    activeCampaignId,
    creators,
    allCreatorsAcrossCampaigns,
    removedCreators,
    selected,
    summary,
    hydrated,
    apiError,
    createCampaign,
    deleteCampaign,
    switchCampaign,
    replaceCreatorsWithSheet,
    appendCreatorsToSheet,
    addCreator,
    updateCreator,
    removeCreator,
    syncContacts,
    importGallery,
    toggleSelect,
    selectAll,
    deselectAll,
  };
}
