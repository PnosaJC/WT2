import type { AppContext } from "../context.js";
import { h } from "../dom.js";
import {
  chosenQuestion,
  continueStaleSession,
  countWords,
  formatDate,
  getOrCreateCurrentSession,
  localDateStr,
  replaceStaleSession,
  stageOf,
} from "../session.js";
import { currentStreak } from "../stats.js";
import { MIN_ESSAY_WORDS, QUESTION_TYPES, TYPE_LABELS, type QuestionType, type Session } from "../types.js";
import { questionBlock, readOnlyText, wordsLabel, writer } from "./common.js";
import { renderSessionDetail } from "./detail.js";

export function renderToday(ctx: AppContext): HTMLElement {
  if (!ctx.bank.ok) return h("div", { class: "notice error" }, ctx.bank.error);

  const current = getOrCreateCurrentSession(ctx.data, ctx.bank.questions);
  if (current.kind === "exhausted") return exhausted(current.typesAvailable);
  if (current.kind === "stale") return staleSessionChoice(ctx, current.session);
  if (current.created) ctx.persist();

  const s = current.session;
  switch (stageOf(s)) {
    case "intros":
      return introsStage(ctx, s);
    case "choose":
      return chooseStage(ctx, s);
    case "essay":
      return essayStage(ctx, s);
    case "done":
      return doneStage(ctx, s);
  }
}

function staleSessionChoice(ctx: AppContext, s: Session): HTMLElement {
  const error = h("div", { class: "rollover-error" });
  const continuePrevious = () => {
    continueStaleSession(s);
    ctx.persist();
    ctx.rerender();
  };
  const startNew = () => {
    if (!ctx.bank.ok) return;
    const result = replaceStaleSession(ctx.data, ctx.bank.questions, s);
    if (result.kind === "exhausted") {
      error.replaceChildren(exhausted(result.typesAvailable));
      return;
    }
    ctx.persist();
    ctx.rerender();
  };

  return h(
    "div",
    { class: "rollover" },
    h("div", { class: "step" }, "a new day has started."),
    h(
      "p",
      { class: "rollover-copy" },
      `You have an unfinished session from ${formatDate(s.date)}. Your questions and writing are saved.`,
    ),
    h(
      "div",
      { class: "rollover-options" },
      h(
        "button",
        { class: "rollover-option", onclick: continuePrevious },
        h("span", { class: "rollover-title" }, "continue previous session"),
        h("span", { class: "rollover-description" }, "keep the same questions and resume exactly where you stopped"),
      ),
      h(
        "button",
        { class: "rollover-option", onclick: startNew },
        h("span", { class: "rollover-title" }, "start with new questions"),
        h(
          "span",
          { class: "rollover-description" },
          "archive this session in history and generate 3 new questions for today",
        ),
      ),
    ),
    h(
      "p",
      { class: "hint" },
      "Your previous writing will not be deleted, and its questions will remain used.",
    ),
    error,
  );
}

function header(s: Session, step: string): HTMLElement {
  const stale = s.date !== localDateStr();
  return h(
    "div",
    { class: "page-head" },
    h("div", { class: "step" }, step),
    h("div", { class: "meta-line" }, stale ? `continuing unfinished session from ${formatDate(s.date)}` : formatDate(s.date)),
  );
}

function introsStage(ctx: AppContext, s: Session): HTMLElement {
  const lockBtn = h("button", { class: "btn primary" }, "lock introductions");
  const refresh = () => {
    lockBtn.disabled = !s.questions.every((q) => (s.intros[q.id] ?? "").trim());
  };
  lockBtn.addEventListener("click", () => {
    if (!confirm("Lock all 3 introductions? You won't be able to edit them afterwards.")) return;
    s.introsLockedAt = new Date().toISOString();
    ctx.persist();
    ctx.rerender();
  });

  const cards = s.questions.map((q, i) => {
    const w = writer({
      value: s.intros[q.id] ?? "",
      placeholder: "write your introduction…",
      className: "intro",
      onInput: (v) => {
        s.intros[q.id] = v;
        refresh();
        ctx.persistSoon();
      },
    });
    return h("section", { class: "card" }, questionBlock(q, i + 1), w.root);
  });
  refresh();

  return h(
    "div",
    {},
    header(s, "step 1 / 2 — write an introduction for each question"),
    ...cards,
    h("div", { class: "actions" }, h("span", { class: "hint" }, "drafts save automatically"), lockBtn),
  );
}

function chooseStage(ctx: AppContext, s: Session): HTMLElement {
  return h(
    "div",
    {},
    header(s, "step 2 / 2 — pick one question to write in full"),
    ...s.questions.map((q, i) =>
      h(
        "section",
        { class: "card pickable" },
        questionBlock(q, i + 1),
        readOnlyText(s.intros[q.id] ?? ""),
        h(
          "div",
          { class: "actions" },
          h("span", { class: "hint" }, wordsLabel(s.intros[q.id] ?? "")),
          h(
            "button",
            {
              class: "btn primary",
              onclick: () => {
                s.chosenId = q.id;
                s.essay = `${(s.intros[q.id] ?? "").trim()}\n\n`;
                ctx.persist();
                ctx.rerender();
              },
            },
            "write full essay →",
          ),
        ),
      ),
    ),
  );
}

function essayStage(ctx: AppContext, s: Session): HTMLElement {
  const q = chosenQuestion(s)!;
  const prefill = `${(s.intros[q.id] ?? "").trim()}\n\n`;

  const submitBtn = h("button", { class: "btn primary" }, "submit essay");
  const w = writer({
    value: s.essay,
    placeholder: "write your essay…",
    className: "essay",
    target: MIN_ESSAY_WORDS,
    onInput: (v) => {
      s.essay = v;
      submitBtn.disabled = !v.trim();
      ctx.persistSoon();
    },
  });
  submitBtn.disabled = !s.essay.trim();

  submitBtn.addEventListener("click", () => {
    const n = countWords(s.essay);
    const msg =
      n < MIN_ESSAY_WORDS
        ? `Your essay has ${n} words — below the ${MIN_ESSAY_WORDS}-word minimum. Submit anyway? It will be locked.`
        : `Submit your essay (${n} words)? It will be locked and can't be edited.`;
    if (!confirm(msg)) return;
    s.submittedAt = new Date().toISOString();
    ctx.persist();
    // A late submission for an earlier day: show it in history rather than jumping to new questions.
    if (s.date !== localDateStr()) ctx.navigate(`#/history/${s.id}`);
    else ctx.rerender();
  });

  const back = h(
    "button",
    {
      class: "link-btn",
      onclick: () => {
        if (s.essay !== prefill && !confirm("Pick a different question? Your essay draft will be discarded.")) return;
        s.chosenId = null;
        s.essay = "";
        ctx.persist();
        ctx.rerender();
      },
    },
    "← pick a different question",
  );

  const page = h(
    "div",
    {},
    header(s, "step 2 / 2 — full essay"),
    h("section", { class: "card" }, questionBlock(q), w.root),
    h("div", { class: "actions" }, back, submitBtn),
  );
  queueMicrotask(() => {
    w.textarea.focus();
    w.textarea.setSelectionRange(w.textarea.value.length, w.textarea.value.length);
  });
  return page;
}

function doneStage(ctx: AppContext, s: Session): HTMLElement {
  const streak = currentStreak(ctx.data);
  return h(
    "div",
    {},
    h(
      "div",
      { class: "done-banner" },
      h("div", { class: "big" }, "done for today."),
      h("div", { class: "meta-line" }, `streak ${streak} ${streak === 1 ? "day" : "days"} · new questions tomorrow`),
    ),
    renderSessionDetail(ctx, s),
  );
}

function exhausted(typesAvailable: QuestionType[]): HTMLElement {
  const missing = QUESTION_TYPES.filter((t) => !typesAvailable.includes(t)).map((t) => TYPE_LABELS[t]);
  return h(
    "div",
    { class: "notice" },
    h("p", {}, "not enough new questions for today."),
    h(
      "p",
      { class: "hint" },
      `Each day needs fresh questions from 3 different types, and you've used every question for: ${missing.join(", ")}. ` +
        "Add more questions to questions.json to continue.",
    ),
  );
}
