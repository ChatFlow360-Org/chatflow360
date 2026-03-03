"use client";

import { useRef, useEffect, useState, useCallback } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<{ success?: unknown; error?: unknown } | null | undefined>;
  onSaved?: () => void;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Auto-saves form data after a debounce period.
 * Compares JSON snapshots to skip unnecessary saves.
 */
export function useAutoSave<T>({
  data,
  onSave,
  onSaved,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const lastSavedRef = useRef(JSON.stringify(data));
  const mountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const onSavedRef = useRef(onSaved);
  const dataRef = useRef(data);

  onSaveRef.current = onSave;
  onSavedRef.current = onSaved;
  dataRef.current = data;

  const hasChanges = JSON.stringify(data) !== lastSavedRef.current;

  // Debounced auto-save
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (!enabled) return;

    const current = JSON.stringify(data);
    if (current === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const result = await onSaveRef.current(dataRef.current);
        if (result?.success) {
          lastSavedRef.current = JSON.stringify(dataRef.current);
          setSaveStatus("saved");
          onSavedRef.current?.();
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, enabled, debounceMs]);

  /** Immediately save (cancels pending debounce). */
  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveStatus("saving");
    try {
      const result = await onSaveRef.current(dataRef.current);
      if (result?.success) {
        lastSavedRef.current = JSON.stringify(dataRef.current);
        setSaveStatus("saved");
        onSavedRef.current?.();
        setTimeout(() => setSaveStatus("idle"), 2000);
        return true;
      } else {
        setSaveStatus("error");
        return false;
      }
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, []);

  /** Mark current data as saved (e.g. after external reset). */
  const markSaved = useCallback(() => {
    lastSavedRef.current = JSON.stringify(dataRef.current);
    setSaveStatus("idle");
  }, []);

  return { saveStatus, hasChanges, saveNow, markSaved };
}
