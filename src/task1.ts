import { localDateStr, newId } from "./session.js";
import type { AppData, Task1Entry } from "./types.js";

export type Task1Stage = "setup" | "writing" | "done";

export function task1Entries(data: AppData): Task1Entry[] {
  return (data.task1 ??= []);
}

export function task1Stage(e: Task1Entry): Task1Stage {
  if (e.submittedAt) return "done";
  return e.startedAt ? "writing" : "setup";
}

/** Entries shown in history/stats: ones the user actually started. */
export function startedTask1(data: AppData): Task1Entry[] {
  return task1Entries(data).filter((e) => e.startedAt);
}

export interface Task1Current {
  entry: Task1Entry;
  /** Data was modified and should be saved. */
  changed: boolean;
  /** Images belonging to removed, never-started entries — safe to delete. */
  orphanImages: string[];
}

/**
 * Today's Task 1 (one per day). Unfinished entries from earlier days are replaced:
 * never-started ones are removed, started ones are kept in history as abandoned.
 */
export function getOrCreateTask1(data: AppData, today = localDateStr()): Task1Current {
  const list = task1Entries(data);
  let changed = false;
  const orphanImages: string[] = [];

  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (e.submittedAt || e.abandonedAt || e.date === today) continue;
    if (e.startedAt) {
      e.abandonedAt = new Date().toISOString();
    } else {
      if (e.imageId) orphanImages.push(e.imageId);
      list.splice(i, 1);
    }
    changed = true;
  }

  let entry = list.find((e) => e.date === today && !e.abandonedAt);
  if (!entry) {
    entry = {
      id: newId(),
      date: today,
      createdAt: new Date().toISOString(),
      imageId: null,
      question: "",
      type: null,
      plan: "",
      report: "",
      startedAt: null,
      submittedAt: null,
      abandonedAt: null,
      comments: [],
    };
    list.push(entry);
    changed = true;
  }
  return { entry, changed, orphanImages };
}
