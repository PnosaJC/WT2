import type { AppContext } from "../context.js";
import { h } from "../dom.js";
import { addDays, formatDate, freshByType, localDateStr, parseLocalDate, usedQuestionIds } from "../session.js";
import { bestStreak, completedDates, currentStreak, essayTotals, statsByType } from "../stats.js";
import { QUESTION_TYPES, TYPE_LABELS } from "../types.js";
import { sectionTitle } from "./common.js";

const WEEKS = 20;

export function renderStats(ctx: AppContext): HTMLElement {
  const { essays, avgWords } = essayTotals(ctx.data);
  const byType = statsByType(ctx.data);
  const fresh = ctx.bank.ok ? freshByType(ctx.bank.questions, usedQuestionIds(ctx.data)) : null;

  const big = (label: string, value: number | string) =>
    h("div", { class: "stat" }, h("div", { class: "stat-label" }, label), h("div", { class: "stat-value" }, value));

  return h(
    "div",
    { class: "stats" },
    h(
      "div",
      { class: "stat-row" },
      big("streak", currentStreak(ctx.data)),
      big("best streak", bestStreak(ctx.data)),
      big("essays", essays),
      big("avg words", avgWords),
    ),
    h("section", { class: "block" }, sectionTitle("last 20 weeks"), heatmap(ctx)),
    h(
      "section",
      { class: "block" },
      sectionTitle("by type"),
      h(
        "table",
        { class: "type-table" },
        h("thead", {}, h("tr", {}, h("th", {}, "type"), h("th", {}, "intros"), h("th", {}, "essays"), h("th", {}, "new left"))),
        h(
          "tbody",
          {},
          ...QUESTION_TYPES.map((t) =>
            h(
              "tr",
              {},
              h("td", {}, TYPE_LABELS[t]),
              h("td", {}, byType[t].intros),
              h("td", {}, byType[t].essays),
              h("td", { class: fresh && fresh[t].length <= 2 ? "low" : "" }, fresh ? fresh[t].length : "?"),
            ),
          ),
        ),
      ),
    ),
  );
}

function heatmap(ctx: AppContext): HTMLElement {
  const today = localDateStr();
  const done = completedDates(ctx.data);
  const started = new Set(ctx.data.sessions.map((s) => s.date));
  const abandoned = new Set(ctx.data.sessions.filter((s) => s.abandonedAt).map((s) => s.date));
  const mondayOffset = (parseLocalDate(today).getDay() + 6) % 7; // 0 = monday
  const start = addDays(today, -(7 * (WEEKS - 1) + mondayOffset));

  const cells: HTMLElement[] = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const day = addDays(start, i);
    if (day > today) {
      cells.push(h("span", { class: "cell future" }));
      continue;
    }
    const cls = done.has(day) ? "on" : started.has(day) ? "partial" : "";
    const note = done.has(day)
      ? "essay submitted"
      : abandoned.has(day)
        ? "abandoned — writing saved in history"
        : started.has(day)
          ? "started, not submitted"
          : "no practice";
    cells.push(h("span", { class: `cell ${cls}`, title: `${formatDate(day)} — ${note}` }));
  }
  return h("div", { class: "heatmap" }, ...cells);
}
