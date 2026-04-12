// yfinance 어댑터 — 1차 데이터 소스
//
// 주의: TypeScript 코드는 yfinance에 직접 접근하지 않는다.
// Python collect.py가 yfinance를 호출하고 JSON을 생성하면,
// 이 어댑터는 그 JSON을 통일 스키마 형식으로 로드한다.
//
// 즉 이 파일은 "yfinance 어댑터 = collect.py + JSON 로딩"의 TypeScript 측 인터페이스다.

import type { DataAdapter, ValidationResult } from "./types";
import { inferAssetTypeFromTicker, validateAsset } from "./types";
import type { Asset, AssetType } from "@/types";
import { loadAllAssets } from "@/lib/load-server-data";

export const yfinanceAdapter: DataAdapter = {
  name: "yfinance",
  supportedTypes: ["equity_etf", "bond", "fx", "commodity", "crypto", "index"],

  async fetch(tickers: string[], _period: string): Promise<Asset[]> {
    // 모든 자산을 로드한 뒤 요청한 티커만 필터
    const all = await loadAllAssets();
    return all.filter((a) => tickers.includes(a.ticker));
  },

  validate(asset: Asset): ValidationResult {
    return validateAsset(asset);
  },

  inferType(ticker: string): AssetType {
    return inferAssetTypeFromTicker(ticker);
  },
};
