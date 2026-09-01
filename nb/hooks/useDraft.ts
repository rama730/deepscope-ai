import { useEffect, useRef, useState } from "react";

type DraftEnvelope<T> = {
  value: T;
  savedAt: number;
};

export type UseDraftOptions<T> = {
  enabled?: boolean;
  debounceMs?: number;
  ttlMs?: number;
  shouldSave?: (value: T) => boolean;
};

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function loadDraft<T>(key: string, ttlMs: number = DEFAULT_TTL): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function useDraft<T>(
  key: string,
  value: T,
  options: UseDraftOptions<T> = {}
) {
  const {
    enabled = true,
    debounceMs = 400,
    ttlMs = DEFAULT_TTL,
    shouldSave = () => true,
  } = options;

  const [restored, setRestored] = useState<T | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  // Restore once on mount/key change
  useEffect(() => {
    if (!enabled) return;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    const draft = loadDraft<T>(key, ttlMs);
    if (draft !== null) setRestored(draft);
  }, [enabled, key, ttlMs]);

  // Debounced save
  useEffect(() => {
    if (!enabled) return;
    if (!shouldSave(value)) return;

    const handle = setTimeout(() => {
      try {
        const envelope: DraftEnvelope<T> = { value, savedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // ignore
      }
    }, debounceMs);

    return () => clearTimeout(handle);
  }, [enabled, key, value, debounceMs, shouldSave]);

  return {
    restored,
    clear: () => clearDraft(key),
  };
}


