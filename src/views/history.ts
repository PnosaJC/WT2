import type { AppContext } from "../context.js";
import { h } from "../dom.js";
import { chosenQuestion, countWords, formatDate } from "../session.js";
import { startedTask1 } from "../task1.js";
import { TASK1_TYPE_LABELS, TYPE_LABELS } from "../types.js";
import { renderSessionDetail, statusLabel } from "./detail.js";
import { renderTask1Detail, task1StatusLabel } from "./task1.js";

interface Row {
  date: string;
  el: HTMLElement;
}

function row(opts: {
  id: string;
  date: string;
  task: string;
  type: string;
  words: string;
  status: string;
  rowClass: string;
  notes: number;
}): HTMLElement {
  return h(
    "a",
    { class: `history-row ${opts.rowClass}`, href: `#/history/${opts.id}` },
    h("span", { class: "col-date" }, formatDate(opts.date)),
    h("span", { class: "col-task" }, opts.task),
    h("span", { class: "col-type" }, opts.type),
    h("span", { class: "col-words" }, opts.words),
    h("span", { class: "col-status" }, opts.status),
    h("span", { class: "col-notes", title: opts.notes ? "self-review notes" : "" }, opts.notes ? `✎ ${opts.notes}` : ""),
  );
}

export function renderHistory(ctx: AppContext): HTMLElement {
  const rows: Row[] = [
    ...ctx.data.sessions.map((s) => {
      const chosen = chosenQuestion(s);
      return {
        date: s.date,
        el: row({
          id: s.id,
          date: s.date,
          task: "task 2",
          type: chosen ? TYPE_LABELS[chosen.type] : "—",
          words: s.submittedAt ? `${countWords(s.essay)} words` : "",
          status: statusLabel(s),
          rowClass: s.abandonedAt ? "abandoned" : s.submittedAt ? "" : "incomplete",
          notes: s.comments.length,
        }),
      };
    }),
    ...startedTask1(ctx.data).map((e) => ({
      date: e.date,
      el: row({
        id: e.id,
        date: e.date,
        task: "task 1",
        type: e.type ? TASK1_TYPE_LABELS[e.type] : "—",
        words: e.submittedAt ? `${countWords(e.report)} words` : "",
        status: task1StatusLabel(e),
        rowClass: `t1 ${e.abandonedAt ? "abandoned" : e.submittedAt ? "" : "incomplete"}`,
        notes: e.comments.length,
      }),
    })),
  ];
  if (!rows.length) return h("div", { class: "notice" }, "no sessions yet — start on the task 2 or task 1 page.");

  // Newest day first (stable sort keeps creation order within a day, then reversed).
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return h("div", { class: "history" }, ...rows.reverse().map((r) => r.el));
}

export function renderHistoryDetail(ctx: AppContext, id: string): HTMLElement {
  const back = h("a", { class: "link-btn", href: "#/history" }, "← history");
  const page = (body: HTMLElement) => h("div", {}, h("div", { class: "page-head" }, back), body);

  const t1 = (ctx.data.task1 ?? []).find((x) => x.id === id);
  if (t1) return page(renderTask1Detail(ctx, t1));
  const s = ctx.data.sessions.find((x) => x.id === id);
  if (s) return page(renderSessionDetail(ctx, s));
  return page(h("div", { class: "notice" }, "session not found."));
}
