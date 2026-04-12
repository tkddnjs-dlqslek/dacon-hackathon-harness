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

// Universe tier — 사전 계산 지표만 (S&P 500 등 대량 자산용)
export interface UniverseAsset {
  ticker: string;
  name: string;
  assetType: AssetType;
  metrics: {
    return1Y: number;
    annReturn: number;
    volatility: number;
    sharpe: number;
    mdd: number;
    currentPrice: number;
    dataPoints: number;
  };
}

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
  equity_etf: "주식 / ETF",
  bond: "채권 / 금리",
  fx: "외환",
  commodity: "원자재",
  crypto: "암호화폐",
  index: "시장 지수",
};

// 영어 → 한글 번역 (UI에 사용)
export const T = {
  // 페이지 제목
  dashboard: "대시보드",
  multiAssetDashboard: "멀티 에셋 대시보드",
  portfolio: "포트폴리오",
  compare: "ETF vs 직접 투자",
  sectors: "섹터",
  assetClasses: "자산 클래스",

  // KPI / 지표
  return: "수익률",
  avgReturn: "평균 수익률",
  volatility: "변동성",
  avgVolatility: "평균 변동성",
  sharpe: "샤프 비율",
  avgSharpe: "평균 샤프",
  mdd: "최대 낙폭",
  worstMDD: "최악 낙폭",
  beta: "베타",
  yield: "수익률(금리)",
  currentYield: "현재 금리",
  yieldChange: "금리 변화",
  rateChange: "환율 변화",
  exchangeRate: "환율",
  range52w: "52주 범위",
  stockCorr: "주식 상관관계",
  btcCorr: "BTC 상관관계",
  globalCorr: "글로벌 상관관계",
  inflationHedge: "인플레 헤지 점수",
  cumulativeReturn: "누적 수익률",
  yieldChangeChart: "금리 변화",
  price: "가격",

  // 자산 분류
  trackedAssets: "추적 자산",
  positiveAssets: "수익 자산",
  negativeAssets: "손실 자산",
  totalAssets: "전체 자산 수",

  // 섹션
  insightSummary: "주요 인사이트",
  classPerformance: "자산 클래스별 성과",
  crossAssetCorr: "크로스 에셋 상관관계",
  crossAssetPerf: "크로스 에셋 누적 수익률",
  allAssets: "전체 자산",
  sectorAlloc: "섹터 비중",
  sectorRanking: "섹터별 수익률 랭킹",
  etfPerformance: "ETF 성과",
  correlationMatrix: "섹터 상관관계 행렬",
  rebalancing: "리밸런싱 비교",
  backtest: "백테스트",
  insights: "인사이트",
  applicableMetrics: "적용 가능한 지표",

  // 네비게이션
  representativeTickers: "대표 티커",
  filter: "필터",

  // 인사이트 라벨
  alert: "경고",
  warn: "주의",
  good: "긍정",
  info: "정보",

  // 기타
  ticker: "종목",
  name: "이름",
  asset: "자산",
  class: "분류",
  weight: "비중",
  contribution: "기여도",
  none: "없음",
  monthly: "월간",
  quarterly: "분기",
  semiAnnual: "반기",
  annual: "연간",
  buyAndHold: "바이앤홀드",
  rebalanced: "리밸런싱",
  equalWeight: "균등 배분",
} as const;

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
