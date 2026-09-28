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
  introsLockedAt: string | null;
  chosenId: string | null;
  essay: string;
  submittedAt: string | null;
  comments: Comment[];
}

export interface AppData {
  version: 1;
  sessions: Session[]; // in creation order
}

export type Stage = "intros" | "choose" | "essay" | "done";
