// 자산 타입별 분석 프로파일 — skills/data-analysis.md §3 구현
// 각 자산 클래스가 어떤 지표·차트·해석 라벨을 사용할지 정의

import type { AssetType } from "@/types";

export interface AssetProfile {
  type: AssetType;
  label: string;
  description: string;
  // 가격 vs 수익률 vs 환율 — 자산별 의미가 다름
  valueLabel: string;       // "Price", "Yield", "Exchange Rate", ...
  valueUnit: string;        // "$", "%", "KRW per USD", ...
  // 자산 타입별 특화 지표
  metrics: MetricDef[];
  // 자산 타입별 인사이트 임계값
  thresholds: {
    highVolatility: number;
    lowVolatility: number;
    severeMDD: number;
  };
  // 자산 타입별 추천 비교 자산 (벤치마크)
  benchmarkTicker?: string;
  // 가격/수익률 해석 모드
  // "price" — close가 가격 (대부분)
  // "yield" — close가 수익률 자체 (^IRX, ^TNX 등)
  // "rate"  — close가 환율 (FX)
  valueMode: "price" | "yield" | "rate";
}

export interface MetricDef {
  key: string;
  label: string;
  applicable: boolean;
  unit?: "%" | "ratio" | "bps" | "" | "$";
}

const COMMON_METRICS: MetricDef[] = [
  { key: "return", label: "Return", applicable: true, unit: "%" },
  { key: "volatility", label: "Volatility", applicable: true, unit: "%" },
  { key: "mdd", label: "Max Drawdown", applicable: true, unit: "%" },
];

export const ASSET_PROFILES: Record<AssetType, AssetProfile> = {
  equity_etf: {
    type: "equity_etf",
    label: "Stocks / ETF",
    description: "주식과 ETF — 회사의 지분에 투자하여 자본 이득과 배당을 추구합니다.",
    valueLabel: "Price",
    valueUnit: "$",
    valueMode: "price",
    benchmarkTicker: "SPY",
    metrics: [
      ...COMMON_METRICS,
      { key: "sharpe", label: "Sharpe Ratio", applicable: true, unit: "ratio" },
      { key: "beta", label: "Beta (vs SPY)", applicable: true, unit: "ratio" },
    ],
    thresholds: { highVolatility: 0.30, lowVolatility: 0.10, severeMDD: -0.20 },
  },

  bond: {
    type: "bond",
    label: "Bonds / Yields",
    description: "국채 수익률 — 채권의 만기 수익률(yield to maturity). 가격이 아닌 % 단위입니다.",
    valueLabel: "Yield",
    valueUnit: "%",
    valueMode: "yield",
    metrics: [
      { key: "currentYield", label: "Current Yield", applicable: true, unit: "%" },
      { key: "yieldChange", label: "Yield Change (1Y, bps)", applicable: true, unit: "bps" },
      { key: "volatility", label: "Yield Volatility", applicable: true, unit: "%" },
      { key: "mdd", label: "Max Yield Drawdown", applicable: true, unit: "%" },
    ],
    thresholds: { highVolatility: 0.25, lowVolatility: 0.05, severeMDD: -0.30 },
  },

  fx: {
    type: "fx",
    label: "Foreign Exchange",
    description: "외환 — 두 통화 간의 환율. 한 통화의 가치를 다른 통화로 표현합니다.",
    valueLabel: "Exchange Rate",
    valueUnit: "",
    valueMode: "rate",
    metrics: [
      { key: "rateChange", label: "Rate Change", applicable: true, unit: "%" },
      { key: "volatility", label: "FX Volatility", applicable: true, unit: "%" },
      { key: "mdd", label: "Max Drawdown", applicable: true, unit: "%" },
      { key: "range52w", label: "52W Range", applicable: true, unit: "" },
    ],
    thresholds: { highVolatility: 0.15, lowVolatility: 0.05, severeMDD: -0.15 },
  },

  commodity: {
    type: "commodity",
    label: "Commodities",
    description: "원자재 — 금·은·원유 등 실물 자산. 인플레이션 헤지 수단으로 활용됩니다.",
    valueLabel: "Price",
    valueUnit: "$",
    valueMode: "price",
    benchmarkTicker: "SPY",
    metrics: [
      ...COMMON_METRICS,
      { key: "stockCorr", label: "Correlation to Stocks", applicable: true, unit: "ratio" },
      { key: "inflationHedge", label: "Inflation Hedge Score", applicable: true, unit: "ratio" },
    ],
    thresholds: { highVolatility: 0.30, lowVolatility: 0.10, severeMDD: -0.25 },
  },

  crypto: {
    type: "crypto",
    label: "Cryptocurrency",
    description: "암호화폐 — 디지털 자산. 매우 높은 변동성이 특징입니다.",
    valueLabel: "Price",
    valueUnit: "$",
    valueMode: "price",
    benchmarkTicker: "BTC-USD",
    metrics: [
      ...COMMON_METRICS,
      { key: "btcCorr", label: "Correlation to BTC", applicable: true, unit: "ratio" },
      { key: "stockCorr", label: "Correlation to Stocks", applicable: true, unit: "ratio" },
    ],
    thresholds: { highVolatility: 0.80, lowVolatility: 0.40, severeMDD: -0.50 },
  },

  index: {
    type: "index",
    label: "Market Indices",
    description: "시장 지수 — 특정 시장이나 섹터의 전체 성과를 나타내는 지표입니다.",
    valueLabel: "Index Value",
    valueUnit: "",
    valueMode: "price",
    benchmarkTicker: "^GSPC",
    metrics: [
      ...COMMON_METRICS,
      { key: "globalCorr", label: "Global Correlation", applicable: true, unit: "ratio" },
    ],
    thresholds: { highVolatility: 0.25, lowVolatility: 0.10, severeMDD: -0.30 },
  },
};

// 슬러그 매핑
export const SLUG_TO_TYPE: Record<string, AssetType> = {
  stocks: "equity_etf",
  "equity-etf": "equity_etf",
  bonds: "bond",
  bond: "bond",
  fx: "fx",
  forex: "fx",
  commodities: "commodity",
  commodity: "commodity",
  crypto: "crypto",
  cryptocurrency: "crypto",
  indices: "index",
  index: "index",
};

export function typeToSlug(type: AssetType): string {
  const reverse: Record<AssetType, string> = {
    equity_etf: "stocks",
    bond: "bonds",
    fx: "fx",
    commodity: "commodities",
    crypto: "crypto",
    index: "indices",
  };
  return reverse[type];
}
