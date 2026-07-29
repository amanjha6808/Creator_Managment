"use client";

import { useState, useCallback, useEffect } from "react";
import { Creator, CreatorCreate, CreatorUpdate, CampaignSummary } from "@/lib/types";
import { generateId } from "@/lib/id";

const STORAGE_KEY = "campaign_creators";

function loadFromStorage(): Creator[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(creators: Creator[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creators));
}

export function useCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    setCreators(stored);
  }, []);

  const persist = useCallback((updated: Creator[]) => {
    setCreators(updated);
    saveToStorage(updated);
  }, []);

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  const addCreator = useCallback(
    async (data: CreatorCreate) => {
      // Backend validation: Name and Handle are required
      if (!data.name?.trim() || !data.handle?.trim()) {
        throw new Error("Name and Instagram ID are required.");
      }

      setLoading(true);
      try {
        const local: Creator = {
          ...data,
          id: generateId(),
          status: data.status ?? "Pending",
        };
        persist([...creators, local]);
        return local;
      } finally {
        setLoading(false);
      }
    },
    [creators, persist]
  );

  const updateCreator = useCallback(
    async (id: string, data: CreatorUpdate) => {
      const prev = creators.find((c) => c.id === id);
      if (!prev) return;

      const updated: Creator = { ...prev, ...data };
      persist(creators.map((c) => (c.id === id ? updated : c)));
    },
    [creators, persist]
  );

  const removeCreator = useCallback(
    async (id: string) => {
      persist(creators.filter((c) => c.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [creators, persist]
  );

  const bulkImport = useCallback(
    async (incoming: CreatorCreate[]) => {
      setLoading(true);
      try {
        const locals: Creator[] = incoming.map((c) => ({
          ...c,
          id: generateId(),
          status: c.status ?? "Pending",
        }));
        persist([...creators, ...locals]);
      } finally {
        setLoading(false);
      }
    },
    [creators, persist]
  );

  const clearAll = useCallback(async () => {
    persist([]);
    setSelected(new Set());
  }, [persist]);

  // ─── Selection ──────────────────────────────────────────────────────────────

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

  const selectedCreators = creators.filter((c) => selected.has(c.id));

  // ─── Campaign Summary ────────────────────────────────────────────────────────

  const summary: CampaignSummary = {
    totalAllocated: creators.reduce((s, c) => s + (Number(c.target_budget) || 0), 0),
    totalSpent: creators.reduce((s, c) => s + (Number(c.locked_commercials) || 0), 0),
    netSavings: creators.reduce(
      (s, c) => s + ((Number(c.target_budget) || 0) - (Number(c.locked_commercials) || 0)),
      0
    ),
    creatorCount: creators.length,
    liveCount: creators.filter((c) => c.status === "Live").length,
  };

  return {
    creators,
    selected,
    selectedCreators,
    summary,
    loading,
    addCreator,
    updateCreator,
    removeCreator,
    bulkImport,
    clearAll,
    toggleSelect,
    selectAll,
    deselectAll,
  };
}
