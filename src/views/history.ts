import type { AppContext } from "../context.js";
import { h } from "../dom.js";
import { chosenQuestion, countWords, formatDate } from "../session.js";
import { TYPE_LABELS } from "../types.js";
import { renderSessionDetail, statusLabel } from "./detail.js";

export function renderHistory(ctx: AppContext): HTMLElement {
  const sessions = [...ctx.data.sessions].reverse();
  if (!sessions.length) return h("div", { class: "notice" }, "no sessions yet — start on the today page.");

  return h(
    "div",
    { class: "history" },
    ...sessions.map((s) => {
      const chosen = chosenQuestion(s);
      return h(
        "a",
        { class: `history-row ${s.submittedAt ? "" : "incomplete"}`, href: `#/history/${s.id}` },
        h("span", { class: "col-date" }, formatDate(s.date)),
        h("span", { class: "col-type" }, chosen ? TYPE_LABELS[chosen.type] : "—"),
        h("span", { class: "col-words" }, s.submittedAt ? `${countWords(s.essay)} words` : ""),
        h("span", { class: "col-status" }, statusLabel(s)),
        s.comments.length ? h("span", { class: "col-notes", title: "self-review notes" }, `✎ ${s.comments.length}`) : h("span", { class: "col-notes" }),
      );
    }),
  );
}

export function renderHistoryDetail(ctx: AppContext, id: string): HTMLElement {
  const s = ctx.data.sessions.find((x) => x.id === id);
  const back = h("a", { class: "link-btn", href: "#/history" }, "← history");
  if (!s) return h("div", {}, back, h("div", { class: "notice" }, "session not found."));
  return h("div", {}, h("div", { class: "page-head" }, back), renderSessionDetail(ctx, s));
}
