// 통일 타입 정의 — data-schema.md 기반 (v3 멀티 에셋)

export type AssetType =
  | "equity_etf"
  | "bond"
  | "fx"
  | "commodity"
  | "crypto"
  | "index";

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 통일 자산 객체
export interface Asset {
  ticker: string;
  name: string;
  assetType: AssetType;
  currency: string;
  data: OHLCV[];
  sector?: string;
  metadata?: Record<string, unknown>;
}

// 분석 결과 (자산 타입 무관)
export interface AssetMetrics {
  ticker: string;
  assetType: AssetType;
  returnPeriod: Record<PeriodLabel, number>;
  volatility: number;
  sharpe: number;
  mdd: number;
  beta?: number; // equity_etf만
}

export type PeriodLabel = "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL";

// ETF 메타데이터 (equity_etf 전용)
export interface ETFMetadata {
  ticker: string;
  name: string;
  sector: string;
  expenseRatio: number;
  topHoldings: { symbol: string; name: string; weight: number }[];
  sectorWeightings: Record<string, number>;
}

// 포트폴리오 (멀티 에셋)
export interface PortfolioAllocation {
  ticker: string;
  weight: number;
}

// 비교 시뮬 (equity_etf 한정)
export interface CompareSettings {
  sector: string;
  etfTicker: string;
  stockCount: 3 | 5 | 10;
  weightMethod: "equal" | "marketCap";
  rebalancePeriod: "none" | "monthly" | "quarterly";
  investmentPeriod: "1Y" | "2Y";
  initialInvestment: number;
  tradingFee: number;
}

// 인사이트
export type InsightLevel = "danger" | "warning" | "success" | "info";

export interface Insight {
  level: InsightLevel;
  message: string;
  relatedTicker?: string;
  relatedAssetType?: AssetType;
}

// visualization.md §2.1
export const ASSET_CLASS_COLORS: Record<AssetType, string> = {
  equity_etf: "#3B82F6",
  bond: "#06B6D4",
  fx: "#8B5CF6",
  commodity: "#F59E0B",
  crypto: "#F97316",
  index: "#6B7280",
};

export const ASSET_CLASS_LABELS: Record<AssetType, string> = {
  equity_etf: "Stocks/ETF",
  bond: "Bonds",
  fx: "FX",
  commodity: "Commodities",
  crypto: "Crypto",
  index: "Indices",
};

export const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3B82F6",
  Energy: "#F59E0B",
  Healthcare: "#10B981",
  Financials: "#8B5CF6",
  "Consumer Disc.": "#EC4899",
  Industrials: "#6B7280",
  "Real Estate": "#F97316",
  Utilities: "#06B6D4",
  "Consumer Staples": "#84CC16",
  Materials: "#A855F7",
  Communication: "#F43F5E",
  Benchmark: "#94A3B8",
};
