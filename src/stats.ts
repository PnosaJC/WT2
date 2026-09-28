import { addDays, chosenQuestion, countWords, localDateStr } from "./session.js";
import { QUESTION_TYPES, type AppData, type QuestionType } from "./types.js";

/** Dates (session start day) that have a submitted essay. */
export function completedDates(data: AppData): Set<string> {
  return new Set(data.sessions.filter((s) => s.submittedAt).map((s) => s.date));
}

/** Consecutive completed days ending today (or yesterday, if today isn't done yet). */
export function currentStreak(data: AppData, today = localDateStr()): number {
  const done = completedDates(data);
  let day = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function bestStreak(data: AppData): number {
  const days = [...completedDates(data)].sort();
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && addDays(days[i - 1], 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export interface TypeStats {
  intros: number;
  essays: number;
}

export function statsByType(data: AppData): Record<QuestionType, TypeStats> {
  const out = Object.fromEntries(QUESTION_TYPES.map((t) => [t, { intros: 0, essays: 0 }])) as Record<
    QuestionType,
    TypeStats
  >;
  for (const s of data.sessions) {
    if (s.introsLockedAt) for (const q of s.questions) out[q.type].intros++;
    const chosen = chosenQuestion(s);
    if (s.submittedAt && chosen) out[chosen.type].essays++;
  }
  return out;
}

export function essayTotals(data: AppData): { essays: number; avgWords: number } {
  const submitted = data.sessions.filter((s) => s.submittedAt);
  const words = submitted.reduce((sum, s) => sum + countWords(s.essay), 0);
  return { essays: submitted.length, avgWords: submitted.length ? Math.round(words / submitted.length) : 0 };
}
