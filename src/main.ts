import type { AppContext } from "./context.js";
import { h } from "./dom.js";
import { loadQuestionBank } from "./questions.js";
import { currentStreak } from "./stats.js";
import { loadData, saveData, STORAGE_KEY } from "./storage.js";
import { renderHistory, renderHistoryDetail } from "./views/history.js";
import { renderStats } from "./views/stats.js";
import { renderTask1 } from "./views/task1.js";
import { renderToday } from "./views/today.js";

const root = document.getElementById("app")!;
let saveTimer: number | undefined;

const ctx: AppContext = {
  data: loadData(),
  bank: { ok: false, error: "loading questions…" },
  persist() {
    window.clearTimeout(saveTimer);
    saveTimer = undefined;
    saveData(ctx.data);
  },
  persistSoon() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => ctx.persist(), 300);
  },
  rerender: render,
  navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  },
};

type Route = { page: "today" } | { page: "task1" } | { page: "history"; id?: string } | { page: "stats" };

function currentRoute(): Route {
  const [page, id] = location.hash.replace(/^#\/?/, "").split("/");
  if (page === "task1") return { page: "task1" };
  if (page === "history") return { page: "history", id: id || undefined };
  if (page === "stats") return { page: "stats" };
  return { page: "today" };
}

function render(): void {
  if (saveTimer !== undefined) ctx.persist(); // flush pending draft before replacing the DOM
  document.onpaste = null; // the task 1 setup page installs its own image-paste handler
  const route = currentRoute();
  const body =
    route.page === "history"
      ? route.id
        ? renderHistoryDetail(ctx, route.id)
        : renderHistory(ctx)
      : route.page === "stats"
        ? renderStats(ctx)
        : route.page === "task1"
          ? renderTask1(ctx)
          : renderToday(ctx);
  root.classList.toggle("wide", route.page === "task1");

  const link = (page: Route["page"], label: string) =>
    h("a", { href: `#/${page}`, class: route.page === page ? "active" : "" }, label);
  const streak = currentStreak(ctx.data);

  root.replaceChildren(
    h(
      "header",
      { class: "top" },
      h("a", { class: "logo", href: "#/today" }, h("span", {}, h("span", { class: "accent" }, "w"), "t2"), h("span", { class: "logo-sub" }, "ielts writing")),
      h("nav", {}, link("today", "task 2"), link("task1", "task 1"), link("history", "history"), link("stats", "stats")),
      h("div", { class: "streak", title: "current streak" }, `streak ${streak}`),
    ),
    h("main", {}, body),
    h("footer", {}, "your writing is saved in this browser only"),
  );
}

window.addEventListener("hashchange", () => {
  window.scrollTo(0, 0);
  render();
});
// Don't lose the last keystrokes when the tab closes or is hidden.
window.addEventListener("beforeunload", () => ctx.persist());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") ctx.persist();
});
// Keep multiple open tabs in sync instead of overwriting each other.
window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY) return;
  ctx.data = loadData();
  render();
});

// Refresh at local midnight so an open unfinished session immediately offers the new-day choice.
function scheduleMidnightRefresh(): void {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  window.setTimeout(() => {
    ctx.persist();
    render();
    scheduleMidnightRefresh();
  }, midnight.getTime() - now.getTime() + 250);
}

render();
scheduleMidnightRefresh();
loadQuestionBank().then((bank) => {
  ctx.bank = bank;
  render();
});
