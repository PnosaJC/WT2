import { QUESTION_TYPES, type AppData, type Question, type QuestionType, type Session, type Stage } from "./types.js";

// ---------- dates (always local time, YYYY-MM-DD) ----------

export function localDateStr(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

export function formatDate(s: string): string {
  return parseLocalDate(s)
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .toLowerCase();
}

export function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    .toLowerCase();
}

// ---------- misc ----------

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function stageOf(s: Session): Stage {
  if (s.submittedAt) return "done";
  if (!s.introsLockedAt) return "intros";
  return s.chosenId ? "essay" : "choose";
}

export function chosenQuestion(s: Session): Question | undefined {
  return s.questions.find((q) => q.id === s.chosenId);
}

// ---------- question selection ----------

/** Every question that has ever been handed out counts as "done" and won't repeat. */
export function usedQuestionIds(data: AppData): Set<string> {
  return new Set(data.sessions.flatMap((s) => s.questions.map((q) => q.id)));
}

export function freshByType(bank: Question[], used: Set<string>): Record<QuestionType, Question[]> {
  const out = Object.fromEntries(QUESTION_TYPES.map((t) => [t, [] as Question[]])) as Record<QuestionType, Question[]>;
  for (const q of bank) if (!used.has(q.id)) out[q.type].push(q);
  return out;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type PickResult = { ok: true; questions: Question[] } | { ok: false; typesAvailable: QuestionType[] };

/** 3 fresh questions, each from a different randomly chosen type. */
export function pickDailyQuestions(bank: Question[], used: Set<string>, rng: () => number = Math.random): PickResult {
  const fresh = freshByType(bank, used);
  const typesAvailable = QUESTION_TYPES.filter((t) => fresh[t].length > 0);
  if (typesAvailable.length < 3) return { ok: false, typesAvailable };
  const types = shuffle(typesAvailable, rng).slice(0, 3);
  return { ok: true, questions: types.map((t) => fresh[t][Math.floor(rng() * fresh[t].length)]) };
}

export type CurrentResult =
  | { kind: "session"; session: Session; created: boolean }
  | { kind: "exhausted"; typesAvailable: QuestionType[] };

/**
 * The session the "today" page should show:
 * - an unfinished session (even from an earlier day) is continued, so work isn't lost at midnight;
 * - a session submitted today is shown as done;
 * - otherwise a new session with 3 fresh questions is created (mutates `data`).
 */
export function getOrCreateCurrentSession(data: AppData, bank: Question[], today = localDateStr()): CurrentResult {
  const latest = data.sessions[data.sessions.length - 1];
  if (latest && (!latest.submittedAt || latest.date === today)) {
    return { kind: "session", session: latest, created: false };
  }
  const pick = pickDailyQuestions(bank, usedQuestionIds(data));
  if (!pick.ok) return { kind: "exhausted", typesAvailable: pick.typesAvailable };

  const session: Session = {
    id: newId(),
    date: today,
    questions: pick.questions,
    intros: {},
    introsLockedAt: null,
    chosenId: null,
    essay: "",
    submittedAt: null,
    comments: [],
  };
  data.sessions.push(session);
  return { kind: "session", session, created: true };
}
