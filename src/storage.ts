import type { AppData } from "./types.js";

export const STORAGE_KEY = "wt2:data:v1";

const empty = (): AppData => ({ version: 1, sessions: [] });

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw) as AppData;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.sessions)) return parsed;
    throw new Error("unexpected data shape");
  } catch (err) {
    // Never silently lose writing: keep the unreadable copy under a separate key.
    localStorage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, raw);
    console.error("Saved data could not be read; a backup copy was kept in localStorage.", err);
    return empty();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
