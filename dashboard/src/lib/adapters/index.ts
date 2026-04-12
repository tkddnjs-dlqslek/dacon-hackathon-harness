// 어댑터 레지스트리 — skills/data-schema.md §2.3

import { yfinanceAdapter } from "./yfinance";
import { csvAdapter, parseCSVText } from "./csv";
import type { DataAdapter } from "./types";

export const ADAPTERS: Record<string, DataAdapter> = {
  yfinance: yfinanceAdapter,
  csv: csvAdapter,
};

export { parseCSVText };
export { inferAssetTypeFromTicker, validateAsset } from "./types";
export type { DataAdapter, ValidationResult } from "./types";

/** 새 어댑터 등록 — 코드 수정 없이 런타임 등록 가능 */
export function registerAdapter(adapter: DataAdapter) {
  ADAPTERS[adapter.name] = adapter;
}
