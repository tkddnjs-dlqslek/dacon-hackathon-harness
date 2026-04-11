// 공통 타입 정의 — Skills.md 데이터 구조 기반

export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ETFTimeSeries {
  ticker: string;
  name: string;
  sector: string;
  data: OHLCVData[];
}

export interface ETFMetadata {
  ticker: string;
  name: string;
  sector: string;
  expenseRatio: number;
  topHoldings: { symbol: string; name: string; weight: number }[];
  sectorWeightings: Record<string, number>;
}

// data-analysis.md §2.1 핵심 지표
export interface ETFMetrics {
  ticker: string;
  returnPeriod: Record<PeriodLabel, number>; // 기간별 수익률
  volatility: number; // 연환산 변동성
  sharpe: number;
  mdd: number; // 최대 낙폭 (음수)
  beta: number;
}

export type PeriodLabel = "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL";

// data-analysis.md §3 포트폴리오
export interface PortfolioAllocation {
  ticker: string;
  weight: number; // 0~1
}

export interface PortfolioMetrics {
  totalReturn: number;
  volatility: number;
  sharpe: number;
  mdd: number;
  allocations: PortfolioAllocation[];
}

// data-analysis.md §4 ETF vs 직접투자
export interface CompareSettings {
  sector: string;
  etfTicker: string;
  stockCount: 3 | 5 | 10 | 20;
  weightMethod: "equal" | "marketCap";
  rebalancePeriod: "none" | "monthly" | "quarterly";
  investmentPeriod: "1Y" | "3Y" | "5Y";
  initialInvestment: number;
  tradingFee: number; // 기본 0.001 (0.1%)
}

export interface CompareResult {
  etf: { cumulativeReturn: number[]; totalCost: number; volatility: number; sharpe: number; mdd: number };
  direct: { cumulativeReturn: number[]; totalCost: number; volatility: number; sharpe: number; mdd: number };
  dates: string[];
  holdings: { symbol: string; weight: number; returnPct: number; volatility: number; contribution: number }[];
}

// insight-generation.md §1
export type InsightLevel = "danger" | "warning" | "success" | "info";

export interface Insight {
  level: InsightLevel;
  message: string;
  relatedTicker?: string;
  relatedSection?: string;
}

// visualization.md §1.1
export type ChartType =
  | "LineChart"
  | "MultiLineChart"
  | "StackedAreaChart"
  | "HorizontalBarChart"
  | "VerticalBarChart"
  | "DonutChart"
  | "ScatterPlot"
  | "Heatmap"
  | "Histogram"
  | "MetricCard"
  | "AreaChart"
  | "DualLineChart"
  | "GroupedBarChart";

// visualization.md §2.1 섹터 색상
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
};
