import type { BankResult } from "./questions.js";
import type { AppData } from "./types.js";

export interface AppContext {
  data: AppData;
  bank: BankResult;
  /** Save immediately. */
  persist(): void;
  /** Save shortly (debounced) — used while typing. */
  persistSoon(): void;
  /** Re-render the current page. */
  rerender(): void;
  navigate(hash: string): void;
}
