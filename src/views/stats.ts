import type { AppContext } from "../context.js";
import { h } from "../dom.js";
import { addDays, formatDate, freshByType, localDateStr, parseLocalDate, usedQuestionIds } from "../session.js";
import {
  bestStreak,
  currentStreak,
  essayTotals,
  statsByType,
  task1Dates,
  task1Totals,
  task2Dates,
} from "../stats.js";
import { startedTask1 } from "../task1.js";
import { QUESTION_TYPES, TASK1_TYPES, TASK1_TYPE_LABELS, TYPE_LABELS } from "../types.js";
import { sectionTitle } from "./common.js";

const WEEKS = 20;

export function renderStats(ctx: AppContext): HTMLElement {
  const { essays, avgWords } = essayTotals(ctx.data);
  const t1 = task1Totals(ctx.data);
  const byType = statsByType(ctx.data);
  const fresh = ctx.bank.ok ? freshByType(ctx.bank.questions, usedQuestionIds(ctx.data)) : null;

  const big = (label: string, value: number | string) =>
    h("div", { class: "stat" }, h("div", { class: "stat-label" }, label), h("div", { class: "stat-value" }, value));

  const t1Rows = [...TASK1_TYPES, "untagged" as const]
    .filter((t) => t !== "untagged" || t1.byType.untagged.reports > 0)
    .map((t) => {
      const r = t1.byType[t];
      return h(
        "tr",
        {},
        h("td", {}, t === "untagged" ? "no type set" : TASK1_TYPE_LABELS[t]),
        h("td", {}, r.reports),
        h("td", {}, r.reports ? Math.round(r.words / r.reports) : "—"),
      );
    });

  return h(
    "div",
    { class: "stats" },
    h(
      "div",
      { class: "stat-row" },
      big("streak", currentStreak(ctx.data)),
      big("best streak", bestStreak(ctx.data)),
      big("task 2 essays", essays),
      big("task 1 reports", t1.reports),
    ),
    h("section", { class: "block" }, sectionTitle("last 20 weeks", "either task counts"), heatmap(ctx)),
    h(
      "section",
      { class: "block" },
      sectionTitle("task 2 by type", essays ? `avg ${avgWords} words` : undefined),
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
    h(
      "section",
      { class: "block" },
      sectionTitle("task 1 by type", t1.reports ? `avg ${t1.avgWords} words` : undefined),
      h(
        "table",
        { class: "type-table" },
        h("thead", {}, h("tr", {}, h("th", {}, "type"), h("th", {}, "reports"), h("th", {}, "avg words"))),
        h("tbody", {}, ...t1Rows),
      ),
    ),
  );
}

function heatmap(ctx: AppContext): HTMLElement {
  const today = localDateStr();
  const t2Done = task2Dates(ctx.data);
  const t1Done = task1Dates(ctx.data);
  const started = new Set([...ctx.data.sessions.map((s) => s.date), ...startedTask1(ctx.data).map((e) => e.date)]);
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
    const done = [t2Done.has(day) ? "task 2" : null, t1Done.has(day) ? "task 1" : null].filter(Boolean);
    const cls = done.length ? "on" : started.has(day) ? "partial" : "";
    const note = done.length
      ? `${done.join(" + ")} submitted`
      : abandoned.has(day)
        ? "abandoned — writing saved in history"
        : started.has(day)
          ? "started, not submitted"
          : "no practice";
    cells.push(h("span", { class: `cell ${cls}`, title: `${formatDate(day)} — ${note}` }));
  }
  return h("div", { class: "heatmap" }, ...cells);
}
