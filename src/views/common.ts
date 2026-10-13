import { h } from "../dom.js";
import { countWords } from "../session.js";
import { TYPE_LABELS, type Question } from "../types.js";

export function questionBlock(q: Question, index?: number): HTMLElement {
  return h(
    "div",
    { class: "question" },
    h("div", { class: "question-type" }, index ? `${index} · ${TYPE_LABELS[q.type]}` : TYPE_LABELS[q.type]),
    h("p", { class: "question-text" }, q.text),
  );
}

export function wordsLabel(text: string, target?: number): string {
  const n = countWords(text);
  const unit = n === 1 ? "word" : "words";
  return target ? `${n} / ${target} ${unit}` : `${n} ${unit}`;
}

/** Word count of each paragraph. Any line break starts a new paragraph; empty lines are ignored. */
export function paragraphCounts(text: string): number[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(countWords);
}

/** "¶1 42 · ¶2 98 · ¶3 87 · ¶4 38" — rendered into `el`; empty when there's under 2 paragraphs. */
function fillParagraphs(el: HTMLElement, text: string): void {
  const counts = paragraphCounts(text);
  el.replaceChildren(
    ...(counts.length < 2
      ? []
      : counts.map((n, i) =>
          h("span", { class: "para" }, h("span", { class: "para-label" }, `¶${i + 1}`), ` ${n}`),
        )),
  );
}

export function paragraphBreakdown(text: string): HTMLElement {
  const el = h("div", { class: "paragraphs", title: "words per paragraph" });
  fillParagraphs(el, text);
  return el;
}

/** Textarea with a live word counter (and optional per-paragraph counts) underneath. */
export function writer(opts: {
  value: string;
  placeholder: string;
  className?: string;
  target?: number;
  paragraphs?: boolean;
  onInput: (value: string) => void;
}): { root: HTMLElement; textarea: HTMLTextAreaElement } {
  const counter = h("span", { class: "counter" });
  const paras = h("div", { class: "paragraphs", title: "words per paragraph" });
  const update = (text: string) => {
    counter.textContent = wordsLabel(text, opts.target);
    counter.classList.toggle("reached", !!opts.target && countWords(text) >= opts.target);
    if (opts.paragraphs) fillParagraphs(paras, text);
  };
  const textarea = h("textarea", {
    class: `writer ${opts.className ?? ""}`,
    placeholder: opts.placeholder,
    value: opts.value,
    spellcheck: false,
    autocomplete: "off",
    autocapitalize: "sentences",
    oninput: () => {
      update(textarea.value);
      opts.onInput(textarea.value);
    },
  });
  update(opts.value);
  return {
    root: h("div", { class: "writer-wrap" }, textarea, h("div", { class: "writer-foot" }, opts.paragraphs ? paras : null, counter)),
    textarea,
  };
}

/** Small label above a box inside a question card ("plan", "introduction"). */
export function fieldLabel(text: string): HTMLElement {
  return h("div", { class: "field-label" }, text);
}

/**
 * Plan notes box. Enter on a "- " line continues the list; Enter on an empty "- " line ends it.
 */
export function planBox(opts: { value: string; onInput: (value: string) => void }): HTMLTextAreaElement {
  const textarea = h("textarea", {
    class: "writer plan",
    placeholder: "plan your points…  (start a line with - for bullets)",
    value: opts.value,
    spellcheck: false,
    autocomplete: "off",
    oninput: () => opts.onInput(textarea.value),
    onkeydown: (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      const { selectionStart: start, selectionEnd: end, value } = textarea;
      if (start !== end) return;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const line = value.slice(lineStart, start);
      const bullet = line.match(/^(\s*)- /);
      if (!bullet) return;
      e.preventDefault();
      if (line.trim() === "-") {
        // Empty bullet: end the list by removing it.
        textarea.setRangeText("", lineStart, start, "end");
      } else {
        textarea.setRangeText(`\n${bullet[1]}- `, start, end, "end");
      }
      opts.onInput(textarea.value);
    },
  });
  return textarea;
}

/** Read-only plan shown later (choose/essay stages, history). Collapsible; nothing if there's no plan. */
export function planReview(plan: string | undefined, open = true): HTMLElement | null {
  if (!plan?.trim()) return null;
  return h(
    "details",
    { class: "plan-review", open },
    h("summary", { class: "field-label" }, "plan"),
    h("div", { class: "readonly plan-text" }, plan.trim()),
  );
}

export function readOnlyText(text: string, className = ""): HTMLElement {
  return text.trim()
    ? h("div", { class: `readonly ${className}` }, text)
    : h("div", { class: `readonly empty ${className}` }, "—");
}

export function sectionTitle(text: string, extra?: HTMLElement | string): HTMLElement {
  return h("h2", { class: "section-title" }, text, extra ? h("span", { class: "section-extra" }, extra) : null);
}
