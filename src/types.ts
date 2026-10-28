export const QUESTION_TYPES = [
  "opinion",
  "discussion",
  "advantages-disadvantages",
  "problem-solution",
  "two-part",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const TYPE_LABELS: Record<QuestionType, string> = {
  opinion: "opinion",
  discussion: "discussion",
  "advantages-disadvantages": "advantages / disadvantages",
  "problem-solution": "problem / solution",
  "two-part": "two-part question",
};

export const MIN_ESSAY_WORDS = 250;

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp
}

/** One practice day: 3 questions → 3 intros → 1 full essay. */
export interface Session {
  id: string;
  date: string; // local YYYY-MM-DD the session was started
  questions: Question[]; // snapshot, so later edits to questions.json don't change history
  intros: Record<string, string>; // questionId → intro text
  /** questionId → plan notes written before the intro. Optional: older sessions have none. */
  plans?: Record<string, string>;
  introsLockedAt: string | null;
  chosenId: string | null;
  essay: string;
  submittedAt: string | null;
  /** Set when the user replaces an unfinished session on a later day. */
  abandonedAt?: string | null;
  /** The latest local date on which the user chose to continue this older session. */
  continuedOnDate?: string | null;
  comments: Comment[];
}

// ---------- task 1 ----------

export const TASK1_TYPES = ["line", "bar", "pie", "table", "map", "process", "mixed"] as const;

export type Task1Type = (typeof TASK1_TYPES)[number];

export const TASK1_TYPE_LABELS: Record<Task1Type, string> = {
  line: "line graph",
  bar: "bar chart",
  pie: "pie chart",
  table: "table",
  map: "map",
  process: "process diagram",
  mixed: "mixed charts",
};

export const MIN_REPORT_WORDS = 150;

/** One Task 1 per day: the user supplies the image and question, then plans and writes the report. */
export interface Task1Entry {
  id: string;
  date: string; // local YYYY-MM-DD
  createdAt: string; // ISO timestamp
  imageId: string | null; // key of the image blob in IndexedDB
  question: string;
  type: Task1Type | null;
  plan: string;
  report: string;
  startedAt: string | null; // image + question locked
  submittedAt: string | null;
  /** Set when a started report is left unfinished and a new day begins. */
  abandonedAt?: string | null;
  comments: Comment[];
}

export interface AppData {
  version: 1;
  sessions: Session[]; // task 2, in creation order
  /** Optional: data saved before Task 1 existed has none. */
  task1?: Task1Entry[];
}

export type Stage = "intros" | "choose" | "essay" | "done";
