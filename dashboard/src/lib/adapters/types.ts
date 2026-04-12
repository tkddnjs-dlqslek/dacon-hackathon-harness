// 데이터 어댑터 인터페이스 — skills/data-schema.md §2 구현

import type { Asset, AssetType } from "@/types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataAdapter {
  /** 어댑터 식별자 */
  name: string;

  /** 처리 가능한 자산 타입 목록 */
  supportedTypes: AssetType[];

  /**
   * 티커 목록을 받아 통일 Asset 배열 반환
   * @param tickers 가져올 티커 (예: ['XLK', '^TNX', 'BTC-USD'])
   * @param period 기간 (예: '2y', '1y', '6mo')
   */
  fetch(tickers: string[], period: string): Promise<Asset[]>;

  /** 통일 스키마 검증 (data-schema.md §4 데이터 품질 규칙) */
  validate(asset: Asset): ValidationResult;

  /** 티커로부터 자산 타입 추론 */
  inferType?(ticker: string): AssetType;
}

/** 티커 패턴 기반 자산 타입 추론 — data-schema.md §2.2 */
export function inferAssetTypeFromTicker(ticker: string): AssetType {
  // 명시적 채권 (Treasury Yields)
  if (/^\^(IRX|FVX|TNX|TYX)$/.test(ticker)) return "bond";
  // 외환
  if (/=X$/.test(ticker)) return "fx";
  // 암호화폐
  if (/-USD$/.test(ticker)) return "crypto";
  // 시장 지수 (^로 시작하나 채권 아닌 것)
  if (/^\^/.test(ticker)) return "index";
  // 그 외는 주식/ETF로 가정
  return "equity_etf";
}

/** 공통 데이터 품질 검증 */
export function validateAsset(asset: Asset): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!asset.ticker) errors.push("ticker is required");
  if (!asset.assetType) errors.push("assetType is required");
  if (!asset.data || asset.data.length === 0) {
    errors.push("data is empty");
  } else {
    if (asset.data.length < 30) warnings.push("data has fewer than 30 rows; analysis may be unreliable");

    // 결측치/이상치 체크
    let nullCount = 0;
    let extremeMoves = 0;
    for (let i = 1; i < asset.data.length; i++) {
      if (!asset.data[i].close || isNaN(asset.data[i].close)) nullCount++;
      const change = Math.abs(asset.data[i].close / asset.data[i - 1].close - 1);
      if (change > 0.5) extremeMoves++;
    }
    if (nullCount > 0) warnings.push(`${nullCount} null close values`);
    if (extremeMoves > 0) warnings.push(`${extremeMoves} extreme daily moves (>50%)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
