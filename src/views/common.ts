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

/** Textarea with a live word counter underneath. */
export function writer(opts: {
  value: string;
  placeholder: string;
  className?: string;
  target?: number;
  onInput: (value: string) => void;
}): { root: HTMLElement; textarea: HTMLTextAreaElement } {
  const counter = h("span", { class: "counter" });
  const update = (text: string) => {
    counter.textContent = wordsLabel(text, opts.target);
    counter.classList.toggle("reached", !!opts.target && countWords(text) >= opts.target);
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
  return { root: h("div", { class: "writer-wrap" }, textarea, h("div", { class: "writer-foot" }, counter)), textarea };
}

export function readOnlyText(text: string, className = ""): HTMLElement {
  return text.trim()
    ? h("div", { class: `readonly ${className}` }, text)
    : h("div", { class: `readonly empty ${className}` }, "—");
}

export function sectionTitle(text: string, extra?: HTMLElement | string): HTMLElement {
  return h("h2", { class: "section-title" }, text, extra ? h("span", { class: "section-extra" }, extra) : null);
}
