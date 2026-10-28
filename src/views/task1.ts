import type { AppContext } from "../context.js";
import { h } from "../dom.js";
import { compressImage, deleteImage, imageUrl, putImage } from "../images.js";
import { countWords, formatDate, formatTime, newId } from "../session.js";
import { currentStreak } from "../stats.js";
import { getOrCreateTask1, task1Stage } from "../task1.js";
import { MIN_REPORT_WORDS, TASK1_TYPES, TASK1_TYPE_LABELS, type Task1Entry } from "../types.js";
import { fieldLabel, paragraphBreakdown, planBox, planReview, readOnlyText, sectionTitle, wordsLabel, writer } from "./common.js";
import { renderComments } from "./detail.js";

export function renderTask1(ctx: AppContext): HTMLElement {
  const current = getOrCreateTask1(ctx.data);
  if (current.changed) ctx.persist();
  for (const id of current.orphanImages) deleteImage(id).catch(() => {});

  const e = current.entry;
  switch (task1Stage(e)) {
    case "setup":
      return setupStage(ctx, e);
    case "writing":
      return writingStage(ctx, e);
    case "done":
      return doneStage(ctx, e);
  }
}

export function task1StatusLabel(e: Task1Entry): string {
  if (e.abandonedAt) return "abandoned";
  if (e.submittedAt) return "submitted";
  return e.startedAt ? "writing report" : "setting up";
}

// ---------- shared pieces ----------

function openLightbox(src: string): void {
  if (!src) return;
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") close();
  };
  const overlay = h("div", { class: "lightbox", title: "click or press esc to close", onclick: close }, h("img", { src, alt: "task 1 visual" }));
  document.body.append(overlay);
  document.addEventListener("keydown", onKey);
}

/** The stored image, loaded asynchronously from IndexedDB. */
export function task1Image(imageId: string | null, enlarge = true): HTMLElement {
  const box = h("div", { class: "t1-image" });
  const missing = (text: string) => box.replaceChildren(h("div", { class: "t1-image-missing" }, text));
  if (!imageId) {
    missing("no image");
    return box;
  }
  const img = h("img", { alt: "task 1 visual" });
  if (enlarge) {
    img.title = "click to enlarge";
    img.classList.add("zoomable");
    img.addEventListener("click", () => openLightbox(img.src));
  }
  box.append(img);
  imageUrl(imageId)
    .then((url) => (url ? (img.src = url) : missing("image not found in this browser")))
    .catch(() => missing("could not load the image"));
  return box;
}

function questionView(e: Task1Entry): HTMLElement {
  return h(
    "div",
    { class: "question" },
    h("div", { class: "question-type" }, e.type ? `task 1 · ${TASK1_TYPE_LABELS[e.type]}` : "task 1"),
    h("p", { class: "question-text" }, e.question.trim()),
  );
}

function header(e: Task1Entry, step: string): HTMLElement {
  return h("div", { class: "page-head" }, h("div", { class: "step" }, step), h("div", { class: "meta-line" }, formatDate(e.date)));
}

// ---------- stage 1: set up the question ----------

function setupStage(ctx: AppContext, e: Task1Entry): HTMLElement {
  const status = h("div", { class: "hint t1-status" });
  const startBtn = h("button", { class: "btn primary" }, "start writing →");
  const refresh = () => {
    startBtn.disabled = !(e.imageId && e.question.trim());
  };

  const addImage = async (file: Blob) => {
    if (!file.type.startsWith("image/")) {
      status.textContent = "that file isn't an image.";
      return;
    }
    status.textContent = "saving image…";
    try {
      const blob = await compressImage(file);
      const id = newId();
      await putImage(id, blob);
      const old = e.imageId;
      e.imageId = id;
      ctx.persist();
      if (old) deleteImage(old).catch(() => {});
      ctx.rerender();
    } catch (err) {
      status.textContent = `couldn't save the image: ${err instanceof Error ? err.message : String(err)}`;
    }
  };

  const fileInput = h("input", {
    type: "file",
    accept: "image/*",
    class: "hidden-input",
    onchange: () => {
      const f = fileInput.files?.[0];
      if (f) void addImage(f);
    },
  });

  const zone = h(
    "div",
    {
      class: `dropzone ${e.imageId ? "has-image" : ""}`,
      tabindex: 0,
      role: "button",
      onclick: () => fileInput.click(),
      onkeydown: (ev: KeyboardEvent) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          fileInput.click();
        }
      },
      ondragover: (ev: DragEvent) => {
        ev.preventDefault();
        zone.classList.add("drag");
      },
      ondragleave: () => zone.classList.remove("drag"),
      ondrop: (ev: DragEvent) => {
        ev.preventDefault();
        zone.classList.remove("drag");
        const f = ev.dataTransfer?.files?.[0];
        if (f) void addImage(f);
      },
    },
    e.imageId ? task1Image(e.imageId, false) : null,
    h(
      "div",
      { class: "dropzone-text" },
      e.imageId ? "paste, drop or click to replace the image" : "paste an image (ctrl + v), drop it here, or click to choose a file",
    ),
  );

  // Paste an image anywhere on this page. Plain-text pastes (e.g. into the question box) are left alone.
  document.onpaste = (ev: ClipboardEvent) => {
    const item = [...(ev.clipboardData?.items ?? [])].find((i) => i.kind === "file" && i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    ev.preventDefault();
    void addImage(file);
  };

  const question = h("textarea", {
    class: "writer t1-question",
    placeholder: "paste or type the question…",
    value: e.question,
    spellcheck: false,
    oninput: () => {
      e.question = question.value;
      refresh();
      ctx.persistSoon();
    },
  });

  const chips = h(
    "div",
    { class: "chips" },
    ...TASK1_TYPES.map((t) =>
      h(
        "button",
        {
          class: `chip ${e.type === t ? "active" : ""}`,
          type: "button",
          "data-type": t,
          onclick: () => {
            e.type = e.type === t ? null : t;
            ctx.persist();
            chips.querySelectorAll<HTMLElement>(".chip").forEach((c) => c.classList.toggle("active", c.dataset.type === e.type));
          },
        },
        TASK1_TYPE_LABELS[t],
      ),
    ),
  );

  startBtn.addEventListener("click", () => {
    if (!confirm("Start writing? The image and question will be locked.")) return;
    e.startedAt = new Date().toISOString();
    ctx.persist();
    ctx.rerender();
  });
  refresh();

  return h(
    "div",
    {},
    header(e, "task 1 — set up today's question"),
    h(
      "section",
      { class: "card" },
      fieldLabel("image"),
      zone,
      fileInput,
      status,
      fieldLabel("question"),
      question,
      fieldLabel("type (optional, for your stats)"),
      chips,
    ),
    h("div", { class: "actions" }, h("span", { class: "hint" }, "one task 1 per day · saves automatically"), startBtn),
  );
}

// ---------- stage 2: plan + report ----------

function writingStage(ctx: AppContext, e: Task1Entry): HTMLElement {
  const submitBtn = h("button", { class: "btn primary" }, "submit report");
  const plan = planBox({
    value: e.plan,
    onInput: (v) => {
      e.plan = v;
      ctx.persistSoon();
    },
  });
  const w = writer({
    value: e.report,
    placeholder: "write your report…",
    className: "essay report",
    target: MIN_REPORT_WORDS,
    paragraphs: true,
    onInput: (v) => {
      e.report = v;
      submitBtn.disabled = !v.trim();
      ctx.persistSoon();
    },
  });
  submitBtn.disabled = !e.report.trim();

  submitBtn.addEventListener("click", () => {
    const n = countWords(e.report);
    const msg =
      n < MIN_REPORT_WORDS
        ? `Your report has ${n} words — below the ${MIN_REPORT_WORDS}-word minimum. Submit anyway? It will be locked.`
        : `Submit your report (${n} words)? It will be locked and can't be edited.`;
    if (!confirm(msg)) return;
    e.submittedAt = new Date().toISOString();
    ctx.persist();
    ctx.rerender();
  });

  return h(
    "div",
    {},
    header(e, "task 1 — plan and write your report"),
    h(
      "div",
      { class: "t1-layout" },
      h("div", { class: "t1-visual" }, task1Image(e.imageId), h("div", { class: "hint" }, "click the image to enlarge")),
      h(
        "div",
        { class: "t1-work" },
        questionView(e),
        fieldLabel("plan"),
        plan,
        fieldLabel("report"),
        w.root,
        h("div", { class: "actions" }, h("span", { class: "hint" }, "drafts save automatically"), submitBtn),
      ),
    ),
  );
}

// ---------- stage 3: done ----------

function doneStage(ctx: AppContext, e: Task1Entry): HTMLElement {
  const streak = currentStreak(ctx.data);
  return h(
    "div",
    {},
    h(
      "div",
      { class: "done-banner" },
      h("div", { class: "big" }, "task 1 done for today."),
      h("div", { class: "meta-line" }, `streak ${streak} ${streak === 1 ? "day" : "days"} · new task 1 tomorrow`),
    ),
    renderTask1Detail(ctx, e),
  );
}

/** Read-only view of a Task 1 entry (done page and history). */
export function renderTask1Detail(ctx: AppContext, e: Task1Entry): HTMLElement {
  return h(
    "div",
    { class: "detail" },
    h(
      "div",
      { class: "meta-line" },
      formatDate(e.date),
      " · task 1 · ",
      task1StatusLabel(e),
      e.submittedAt ? ` · ${formatTime(e.submittedAt)}` : null,
    ),
    h(
      "section",
      { class: "block" },
      sectionTitle(e.submittedAt ? "report" : "report draft (abandoned)", wordsLabel(e.report, MIN_REPORT_WORDS)),
      task1Image(e.imageId),
      questionView(e),
      planReview(e.plan),
      fieldLabel("report"),
      readOnlyText(e.report, "essay-text"),
      paragraphBreakdown(e.report),
    ),
    e.submittedAt ? renderComments(ctx, e) : null,
  );
}
