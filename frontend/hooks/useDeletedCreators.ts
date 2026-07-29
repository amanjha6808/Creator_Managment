"use client";

import { useState, useCallback, useEffect } from "react";
import { DeletedCreatorRecord } from "@/lib/types";

const STORAGE_KEY = "deleted_creators_v1";

function loadFromStorage(): DeletedCreatorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(records: DeletedCreatorRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useDeletedCreators() {
  const [records, setRecords] = useState<DeletedCreatorRecord[]>([]);

  useEffect(() => {
    setRecords(loadFromStorage());
  }, []);

  const addRecord = useCallback(
    (record: DeletedCreatorRecord) => {
      const updated = [record, ...records];
      setRecords(updated);
      saveToStorage(updated);
    },
    [records]
  );

  const clearAll = useCallback(() => {
    setRecords([]);
    saveToStorage([]);
  }, []);

  return { records, addRecord, clearAll };
}
