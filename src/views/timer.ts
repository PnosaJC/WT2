import { h } from "../dom.js";
import type { TimerState } from "../types.js";

export type TimerKind = "plan" | "essay";

const SETTINGS_KEY = "wt2:timer-minutes";
const DEFAULT_MINUTES: Record<TimerKind, number> = { plan: 15, essay: 40 };
const MIN = 1;
const MAX = 180;

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, Math.round(n)));

function readSettings(): Partial<Record<TimerKind, number>> {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

/** The user's last chosen length for this timer, or the default (15 / 40 minutes). */
export function savedMinutes(kind: TimerKind): number {
  const v = readSettings()[kind];
  return typeof v === "number" && Number.isFinite(v) ? clamp(v) : DEFAULT_MINUTES[kind];
}

function saveMinutes(kind: TimerKind, minutes: number): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), [kind]: minutes }));
}

/** 14:32 while time is left; +02:15 once it has run out. */
export function formatRemaining(seconds: number): string {
  const s = Math.abs(seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${seconds < 0 ? "+" : ""}${mm}:${ss}`;
}

/**
 * Countdown bar. Before starting, the length can be changed; after starting it can't be
 * paused or changed. At zero it keeps going, counting the overtime in red.
 */
export function timerBar(opts: {
  kind: TimerKind;
  label: string;
  state: TimerState | null | undefined;
  onStart: (state: TimerState) => void;
}): HTMLElement {
  const root = h("div", { class: "timer", "data-kind": opts.kind });
  const time = h("div", { class: "timer-time", role: "timer", "aria-live": "off" });
  let interval: number | undefined;

  const paint = (remaining: number) => {
    time.textContent = formatRemaining(remaining);
    time.classList.toggle("warn", remaining > 0 && remaining <= 60);
    time.classList.toggle("over", remaining <= 0);
  };

  const showIdle = () => {
    let minutes = savedMinutes(opts.kind);
    const input = h("input", {
      type: "number",
      min: MIN,
      max: MAX,
      step: 1,
      value: String(minutes),
      class: "timer-input",
      "aria-label": `${opts.label} minutes`,
      oninput: () => {
        const n = Number(input.value);
        if (Number.isFinite(n) && n >= MIN) {
          minutes = clamp(n);
          paint(minutes * 60);
        }
      },
      onchange: () => {
        input.value = String(minutes);
      },
    });
    const step = (delta: number) =>
      h(
        "button",
        {
          class: "link-btn timer-step",
          type: "button",
          title: `${delta > 0 ? "add" : "remove"} ${Math.abs(delta)} minutes`,
          onclick: () => {
            minutes = clamp(minutes + delta);
            input.value = String(minutes);
            paint(minutes * 60);
          },
        },
        delta > 0 ? `+${delta}` : `−${-delta}`,
      );
    const start = h(
      "button",
      {
        class: "btn primary timer-start",
        type: "button",
        onclick: () => {
          saveMinutes(opts.kind, minutes);
          const state = { startedAt: new Date().toISOString(), minutes };
          opts.onStart(state);
          showRunning(state);
        },
      },
      "start timer",
    );
    paint(minutes * 60);
    root.replaceChildren(
      time,
      h(
        "div",
        { class: "timer-controls" },
        h("span", { class: "timer-label" }, opts.label),
        step(-5),
        input,
        h("span", { class: "timer-unit" }, "min"),
        step(5),
        start,
      ),
    );
  };

  const showRunning = (state: TimerState) => {
    const end = Date.parse(state.startedAt) + state.minutes * 60_000;
    let mounted = false;
    const tick = () => {
      // The page re-renders by replacing its DOM; stop ticking once this bar is gone.
      if (root.isConnected) mounted = true;
      else if (mounted) {
        window.clearInterval(interval);
        return;
      }
      paint(Math.ceil((end - Date.now()) / 1000));
    };
    root.replaceChildren(
      time,
      h(
        "div",
        { class: "timer-controls" },
        h("span", { class: "timer-label" }, `${opts.label} · ${state.minutes} min`),
      ),
    );
    tick();
    window.clearInterval(interval);
    interval = window.setInterval(tick, 250);
  };

  if (opts.state) showRunning(opts.state);
  else showIdle();
  return root;
}
