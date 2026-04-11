// 분석 엔진 — skills/data-analysis.md 규칙 구현
// §1 전처리, §2 지표 계산, §3 포트폴리오, §4 ETF vs 직접투자

import type { OHLCVData, ETFMetrics, PeriodLabel } from "@/types";

// §1.3 일간 수익률
export function dailyReturns(data: OHLCVData[]): number[] {
  return data.slice(1).map((d, i) => (d.close - data[i].close) / data[i].close);
}

// §1.3 누적 수익률
export function cumulativeReturns(data: OHLCVData[]): number[] {
  const base = data[0].close;
  return data.map((d) => d.close / base - 1);
}

// §2.1 연환산 수익률
export function annualizedReturn(data: OHLCVData[]): number {
  const totalReturn = data[data.length - 1].close / data[0].close - 1;
  const tradingDays = data.length;
  return Math.pow(1 + totalReturn, 252 / tradingDays) - 1;
}

// §2.1 변동성 (연환산)
export function volatility(data: OHLCVData[]): number {
  const returns = dailyReturns(data);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

// §2.1 샤프 비율
export function sharpeRatio(data: OHLCVData[], riskFreeRate: number): number {
  const annReturn = annualizedReturn(data);
  const vol = volatility(data);
  if (vol === 0) return 0;
  return (annReturn - riskFreeRate) / vol;
}

// §2.1 최대 낙폭 (MDD)
export function maxDrawdown(data: OHLCVData[]): number {
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
export function filterByPeriod(data: OHLCVData[], period: PeriodLabel): OHLCVData[] {
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
  data: OHLCVData[],
  riskFreeRate: number
): ETFMetrics {
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
    returnPeriod: returnPeriod as Record<PeriodLabel, number>,
    volatility: volatility(data),
    sharpe: sharpeRatio(data, riskFreeRate),
    mdd: maxDrawdown(data),
    beta: 0, // SPY 데이터와 함께 계산 시 채움
  };
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
