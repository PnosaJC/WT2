import type { AppContext } from "../context.js";
import { h } from "../dom.js";
import { chosenQuestion, formatDate, formatTime, newId } from "../session.js";
import { MIN_ESSAY_WORDS, type Session } from "../types.js";
import { questionBlock, readOnlyText, sectionTitle, wordsLabel } from "./common.js";

export function statusLabel(s: Session): string {
  if (s.submittedAt) return "submitted";
  if (s.chosenId) return "writing essay";
  if (s.introsLockedAt) return "intros locked";
  return "writing intros";
}

/** Read-only view of a session: essay, intros and self-review comments. */
export function renderSessionDetail(ctx: AppContext, s: Session): HTMLElement {
  const chosen = chosenQuestion(s);
  const parts: HTMLElement[] = [];

  if (chosen && s.essay.trim()) {
    parts.push(
      h(
        "section",
        { class: "block" },
        sectionTitle(s.submittedAt ? "essay" : "essay draft (not submitted)", wordsLabel(s.essay, MIN_ESSAY_WORDS)),
        questionBlock(chosen),
        readOnlyText(s.essay, "essay-text"),
      ),
    );
  }

  parts.push(
    h(
      "section",
      { class: "block" },
      sectionTitle("introductions"),
      ...s.questions.map((q, i) =>
        h(
          "div",
          { class: `intro-review ${q.id === s.chosenId ? "chosen" : ""}` },
          questionBlock(q, i + 1),
          readOnlyText(s.intros[q.id] ?? ""),
          h(
            "div",
            { class: "meta-line" },
            wordsLabel(s.intros[q.id] ?? ""),
            q.id === s.chosenId ? h("span", { class: "tag" }, "full essay") : null,
          ),
        ),
      ),
    ),
  );

  if (s.submittedAt) parts.push(renderComments(ctx, s));

  return h(
    "div",
    { class: "detail" },
    h(
      "div",
      { class: "meta-line" },
      formatDate(s.date),
      " · ",
      statusLabel(s),
      s.submittedAt ? ` · ${formatTime(s.submittedAt)}` : null,
    ),
    ...parts,
  );
}

function renderComments(ctx: AppContext, s: Session): HTMLElement {
  const section = h("section", { class: "block comments" });

  const draw = () => {
    const input = h("textarea", {
      class: "writer comment-input",
      placeholder: "add a self-review note… (ctrl + enter to save)",
      spellcheck: false,
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add();
      },
    });
    const add = () => {
      const text = input.value.trim();
      if (!text) return;
      s.comments.push({ id: newId(), text, createdAt: new Date().toISOString() });
      ctx.persist();
      draw();
    };

    section.replaceChildren(
      sectionTitle("self-review", s.comments.length ? `${s.comments.length}` : undefined),
      ...s.comments.map((c) =>
        h(
          "div",
          { class: "comment" },
          h(
            "div",
            { class: "comment-head" },
            h("span", {}, formatTime(c.createdAt)),
            h(
              "button",
              {
                class: "link-btn",
                title: "delete note",
                onclick: () => {
                  if (!confirm("Delete this note?")) return;
                  s.comments = s.comments.filter((x) => x.id !== c.id);
                  ctx.persist();
                  draw();
                },
              },
              "delete",
            ),
          ),
          h("div", { class: "comment-text" }, c.text),
        ),
      ),
      input,
      h("div", { class: "actions" }, h("button", { class: "btn", onclick: add }, "add note")),
    );
  };

  draw();
  return section;
}
