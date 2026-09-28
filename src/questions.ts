import { QUESTION_TYPES, type Question, type QuestionType } from "./types.js";

export type BankResult = { ok: true; questions: Question[] } | { ok: false; error: string };

export function validateBank(json: unknown): BankResult {
  const list = (json as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(list)) return { ok: false, error: 'questions.json must contain a "questions" array.' };

  const errors: string[] = [];
  const seen = new Set<string>();
  const questions: Question[] = [];
  list.forEach((item, i) => {
    const q = item as Partial<Question> | null;
    const where = `questions[${i}]`;
    if (typeof q?.id !== "string" || !q.id.trim()) return void errors.push(`${where}: missing id`);
    if (seen.has(q.id)) return void errors.push(`${where}: duplicate id "${q.id}"`);
    if (!QUESTION_TYPES.includes(q.type as QuestionType)) return void errors.push(`${where}: unknown type "${q.type}"`);
    if (typeof q.text !== "string" || !q.text.trim()) return void errors.push(`${where}: missing text`);
    seen.add(q.id);
    questions.push({ id: q.id, type: q.type as QuestionType, text: q.text.trim() });
  });

  if (errors.length) return { ok: false, error: `questions.json has problems:\n${errors.join("\n")}` };
  return { ok: true, questions };
}

export async function loadQuestionBank(): Promise<BankResult> {
  try {
    const res = await fetch("./questions.json", { cache: "no-cache" });
    if (!res.ok) return { ok: false, error: `Could not load questions.json (HTTP ${res.status}).` };
    return validateBank(await res.json());
  } catch (err) {
    return { ok: false, error: `Could not load questions.json: ${String(err)}` };
  }
}
