// 분석 엔진 — skills/data-analysis.md 규칙 구현
// §1 전처리, §2 지표 계산, §3 포트폴리오, §4 ETF vs 직접투자

import type { OHLCV, AssetMetrics, AssetType, PeriodLabel, CompareSettings } from "@/types";

// CompareResult는 인라인 정의
export interface CompareResult {
  etf: { cumulativeReturn: number[]; totalCost: number; volatility: number; sharpe: number; mdd: number };
  direct: { cumulativeReturn: number[]; totalCost: number; volatility: number; sharpe: number; mdd: number };
  dates: string[];
  holdings: { symbol: string; weight: number; returnPct: number; volatility: number; contribution: number }[];
}

// ── §1.2 결측치 처리 ─────────────────────────────────

export function fillMissing(data: OHLCV[]): OHLCV[] {
  if (data.length === 0) return data;
  const result = [...data];
  let consecutiveGap = 0;

  for (let i = 1; i < result.length; i++) {
    if (result[i].close === 0 || isNaN(result[i].close)) {
      consecutiveGap++;
      if (consecutiveGap <= 2) {
        // forward fill (1~2일)
        result[i] = { ...result[i], close: result[i - 1].close, open: result[i - 1].close, high: result[i - 1].close, low: result[i - 1].close };
      }
      // 3일+ 연속은 그대로 두고 UI에서 경고
    } else {
      consecutiveGap = 0;
    }
    // 거래량 결측 → 0
    if (isNaN(result[i].volume)) {
      result[i] = { ...result[i], volume: 0 };
    }
  }
  return result;
}

// §1.3 일간 수익률
export function dailyReturns(data: OHLCV[]): number[] {
  return data.slice(1).map((d, i) => (d.close - data[i].close) / data[i].close);
}

// §1.3 누적 수익률
export function cumulativeReturns(data: OHLCV[]): number[] {
  const base = data[0].close;
  return data.map((d) => d.close / base - 1);
}

// §2.1 연환산 수익률
export function annualizedReturn(data: OHLCV[]): number {
  const totalReturn = data[data.length - 1].close / data[0].close - 1;
  const tradingDays = data.length;
  return Math.pow(1 + totalReturn, 252 / tradingDays) - 1;
}

// §2.1 변동성 (연환산)
export function volatility(data: OHLCV[]): number {
  const returns = dailyReturns(data);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

// §2.1 샤프 비율
export function sharpeRatio(data: OHLCV[], riskFreeRate: number): number {
  const annReturn = annualizedReturn(data);
  const vol = volatility(data);
  if (vol === 0) return 0;
  return (annReturn - riskFreeRate) / vol;
}

// §2.1 최대 낙폭 (MDD)
export function maxDrawdown(data: OHLCV[]): number {
  let peak = data[0].close;
  let mdd = 0;
  for (const d of data) {
    if (d.close > peak) peak = d.close;
    const dd = (d.close - peak) / peak;
    if (dd < mdd) mdd = dd;
  }
  return mdd;
}

// §2.3 기간 필터
export function filterByPeriod(data: OHLCV[], period: PeriodLabel): OHLCV[] {
  if (period === "ALL") return data;

  const tradingDays: Record<string, number> = {
    "1M": 21,
    "3M": 63,
    "6M": 126,
    "1Y": 252,
  };

  if (period === "YTD") {
    const currentYear = new Date().getFullYear();
    return data.filter((d) => new Date(d.date).getFullYear() === currentYear);
  }

  const days = tradingDays[period] ?? data.length;
  return data.slice(-days);
}

// §2.1 상관계수 (피어슨)
export function correlation(returnsA: number[], returnsB: number[]): number {
  const n = Math.min(returnsA.length, returnsB.length);
  const a = returnsA.slice(-n);
  const b = returnsB.slice(-n);

  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;

  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : cov / denom;
}

// §2.1 전체 지표 계산
export function computeMetrics(
  ticker: string,
  assetType: AssetType,
  data: OHLCV[],
  riskFreeRate: number
): AssetMetrics {
  const periods: PeriodLabel[] = ["1M", "3M", "6M", "1Y", "YTD", "ALL"];
  const returnPeriod: Record<string, number> = {};

  for (const p of periods) {
    const filtered = filterByPeriod(data, p);
    if (filtered.length >= 2) {
      returnPeriod[p] = filtered[filtered.length - 1].close / filtered[0].close - 1;
    } else {
      returnPeriod[p] = 0;
    }
  }

  return {
    ticker,
    assetType,
    returnPeriod: returnPeriod as Record<PeriodLabel, number>,
    volatility: volatility(data),
    sharpe: sharpeRatio(data, riskFreeRate),
    mdd: maxDrawdown(data),
    beta: 0,
  };
}

// §2.1 베타 (vs 벤치마크)
export function beta(assetReturns: number[], benchmarkReturns: number[]): number {
  const n = Math.min(assetReturns.length, benchmarkReturns.length);
  const a = assetReturns.slice(-n);
  const b = benchmarkReturns.slice(-n);

  const meanB = b.reduce((s, v) => s + v, 0) / n;
  const meanA = a.reduce((s, v) => s + v, 0) / n;

  let cov = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - meanA) * (b[i] - meanB);
    varB += (b[i] - meanB) ** 2;
  }

  return varB === 0 ? 0 : cov / varB;
}

// §2.1 + SPY 기반 전체 지표 (베타 포함)
export function computeMetricsWithBenchmark(
  ticker: string,
  assetType: AssetType,
  data: OHLCV[],
  benchmarkData: OHLCV[],
  riskFreeRate: number
): AssetMetrics {
  const metrics = computeMetrics(ticker, assetType, data, riskFreeRate);
  const assetRet = dailyReturns(data);
  const benchRet = dailyReturns(benchmarkData);
  metrics.beta = beta(assetRet, benchRet);
  return metrics;
}

// ── §2 상관관계 행렬 ─────────────────────────────────

export function correlationMatrix(allReturns: number[][]): number[][] {
  const n = allReturns.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const corr = correlation(allReturns[i], allReturns[j]);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }
  return matrix;
}

// 공분산 행렬 (연환산)
export function covarianceMatrix(allReturns: number[][]): number[][] {
  const n = allReturns.length;
  const len = Math.min(...allReturns.map((r) => r.length));
  const trimmed = allReturns.map((r) => r.slice(-len));
  const means = trimmed.map((r) => r.reduce((a, b) => a + b, 0) / len);
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let cov = 0;
      for (let k = 0; k < len; k++) {
        cov += (trimmed[i][k] - means[i]) * (trimmed[j][k] - means[j]);
      }
      const annualized = (cov / (len - 1)) * 252;
      matrix[i][j] = annualized;
      matrix[j][i] = annualized;
    }
  }
  return matrix;
}

// §3.1 포트폴리오 가중 수익률
export function portfolioReturn(
  weights: number[],
  returns: number[]
): number {
  return weights.reduce((sum, w, i) => sum + w * returns[i], 0);
}

// §3.2 포트폴리오 변동성
export function portfolioVolatility(
  weights: number[],
  covMatrix: number[][]
): number {
  let result = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      result += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return Math.sqrt(result);
}

// §3.4 리밸런싱 시뮬레이션
export function rebalanceSimulation(
  allData: OHLCV[][],  // 각 ETF의 가격 시계열
  targetWeights: number[],
  rebalancePeriodDays: number, // 0 = 바이앤홀드
  initialInvestment: number = 10000
): { dates: string[]; rebalanced: number[]; buyAndHold: number[] } {
  const len = Math.min(...allData.map((d) => d.length));
  const n = allData.length;
  const dates: string[] = [];
  const rebalanced: number[] = [];
  const buyAndHold: number[] = [];

  // 초기 배분
  let rbShares = targetWeights.map((w, i) => (w * initialInvestment) / allData[i][0].close);
  let bhShares = [...rbShares];
  let daysSinceRebalance = 0;

  for (let d = 0; d < len; d++) {
    dates.push(allData[0][d].date);

    // 현재 포트폴리오 가치
    const rbValue = rbShares.reduce((s, sh, i) => s + sh * allData[i][d].close, 0);
    const bhValue = bhShares.reduce((s, sh, i) => s + sh * allData[i][d].close, 0);
    rebalanced.push(rbValue);
    buyAndHold.push(bhValue);

    // 리밸런싱
    daysSinceRebalance++;
    if (rebalancePeriodDays > 0 && daysSinceRebalance >= rebalancePeriodDays && d < len - 1) {
      rbShares = targetWeights.map((w, i) => (w * rbValue) / allData[i][d].close);
      daysSinceRebalance = 0;
    }
  }

  return { dates, rebalanced, buyAndHold };
}

// ── §4 ETF vs 직접투자 비교 시뮬레이션 ──────────────

export function compareETFvsDirect(
  etfData: OHLCV[],
  stocksData: OHLCV[][], // 개별종목 배열
  settings: CompareSettings,
  riskFreeRate: number
): CompareResult {
  const len = Math.min(etfData.length, ...stocksData.map((d) => d.length));
  const n = stocksData.length;

  // 비중 결정
  const stockWeights = settings.weightMethod === "equal"
    ? Array(n).fill(1 / n)
    : Array(n).fill(1 / n); // TODO: 시총 비중은 메타데이터 필요

  const dates: string[] = [];
  const etfCumulative: number[] = [];
  const directCumulative: number[] = [];

  // 초기 투자
  const init = settings.initialInvestment;
  const fee = settings.tradingFee;
  const expenseDaily = 0.0008 / 252; // ETF 보수 일할

  let etfShares = (init * (1 - fee)) / etfData[0].close;
  let directShares = stockWeights.map((w, i) => (w * init * (1 - fee)) / stocksData[i][0].close);
  let etfTotalCost = init * fee;
  let directTotalCost = n * init * fee; // N번 거래

  // 리밸런싱 주기 (거래일 기준)
  const rbDays = settings.rebalancePeriod === "monthly" ? 21
    : settings.rebalancePeriod === "quarterly" ? 63
    : 0;
  let daysSinceRb = 0;

  for (let d = 0; d < len; d++) {
    dates.push(etfData[d].date);

    // ETF 가치 (보수 차감)
    const etfValue = etfShares * etfData[d].close;
    etfShares *= (1 - expenseDaily); // 일할 보수 차감
    etfTotalCost += etfValue * expenseDaily;
    etfCumulative.push(etfShares * etfData[d].close);

    // 직접투자 가치
    const directValue = directShares.reduce((s, sh, i) => s + sh * stocksData[i][d].close, 0);
    directCumulative.push(directValue);

    // 직접투자 리밸런싱
    daysSinceRb++;
    if (rbDays > 0 && daysSinceRb >= rbDays && d < len - 1) {
      const rbCost = n * directValue * fee;
      directTotalCost += rbCost;
      const afterFee = directValue - rbCost;
      directShares = stockWeights.map((w, i) => (w * afterFee) / stocksData[i][d].close);
      daysSinceRb = 0;
    }
  }

  // 지표 계산 (누적 수익률 배열 → OHLCV 변환)
  const toOHLCV = (values: number[]): OHLCV[] =>
    values.map((v, i) => ({ date: dates[i], open: v, high: v, low: v, close: v, volume: 0 }));

  const etfOHLCV = toOHLCV(etfCumulative);
  const directOHLCV = toOHLCV(directCumulative);

  // 개별 종목 기여도
  const holdings = stocksData.map((sd, i) => {
    const ret = len >= 2 ? sd[len - 1].close / sd[0].close - 1 : 0;
    const vol = volatility(sd.slice(0, len));
    return {
      symbol: "", // 호출자가 채움
      weight: stockWeights[i],
      returnPct: ret,
      volatility: vol,
      contribution: stockWeights[i] * ret,
    };
  });

  return {
    etf: {
      cumulativeReturn: etfCumulative,
      totalCost: etfTotalCost,
      volatility: volatility(etfOHLCV),
      sharpe: sharpeRatio(etfOHLCV, riskFreeRate),
      mdd: maxDrawdown(etfOHLCV),
    },
    direct: {
      cumulativeReturn: directCumulative,
      totalCost: directTotalCost,
      volatility: volatility(directOHLCV),
      sharpe: sharpeRatio(directOHLCV, riskFreeRate),
      mdd: maxDrawdown(directOHLCV),
    },
    dates,
    holdings,
  };
}
