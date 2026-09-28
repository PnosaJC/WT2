// Build: validate questions.json, copy static files to dist/, compile TypeScript.
import { cpSync, readFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const TYPES = ["opinion", "discussion", "advantages-disadvantages", "problem-solution", "two-part"];

function validateQuestions(path) {
  const json = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(json.questions)) throw new Error(`${path}: "questions" must be an array`);
  const seen = new Set();
  const errors = [];
  json.questions.forEach((q, i) => {
    const where = `questions[${i}]${q && q.id ? ` (${q.id})` : ""}`;
    if (!q || typeof q.id !== "string" || !q.id.trim()) errors.push(`${where}: missing "id"`);
    else if (seen.has(q.id)) errors.push(`${where}: duplicate id`);
    else seen.add(q.id);
    if (!TYPES.includes(q?.type)) errors.push(`${where}: "type" must be one of ${TYPES.join(", ")}`);
    if (typeof q?.text !== "string" || !q.text.trim()) errors.push(`${where}: missing "text"`);
  });
  if (errors.length) throw new Error(`Invalid ${path}:\n  ${errors.join("\n  ")}`);
  const perType = TYPES.map((t) => `${t}: ${json.questions.filter((q) => q.type === t).length}`);
  console.log(`questions.json OK — ${json.questions.length} questions (${perType.join(", ")})`);
}

validateQuestions("public/questions.json");
rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", { recursive: true });
execSync("tsc -p .", { stdio: "inherit" });
console.log("Built to dist/");
