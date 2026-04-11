// 인사이트 자동 생성 — skills/insight-generation.md 규칙 구현

import type { ETFMetrics, Insight, InsightLevel } from "@/types";

// §2 개별 ETF 인사이트
export function generateETFInsights(metrics: ETFMetrics): Insight[] {
  const insights: Insight[] = [];
  const t = metrics.ticker;

  // 수익률 기반 (§2 수익률)
  const r1m = metrics.returnPeriod["1M"] * 100;
  const rYtd = metrics.returnPeriod["YTD"] * 100;

  if (r1m > 10) {
    insights.push({ level: "success", message: `${t}이(가) 최근 1개월간 ${r1m.toFixed(1)}% 상승하며 강한 모멘텀을 보이고 있습니다.`, relatedTicker: t });
  } else if (r1m < -10) {
    insights.push({ level: "danger", message: `${t}이(가) 최근 1개월간 ${r1m.toFixed(1)}% 하락했습니다. 손실 관리에 주의하세요.`, relatedTicker: t });
  }

  if (rYtd > 20) {
    insights.push({ level: "success", message: `${t}의 연초 대비 수익률이 ${rYtd.toFixed(1)}%로 시장 대비 우수합니다.`, relatedTicker: t });
  } else if (rYtd < -20) {
    insights.push({ level: "danger", message: `${t}의 연초 대비 수익률이 ${rYtd.toFixed(1)}%로 부진합니다.`, relatedTicker: t });
  }

  // 변동성 기반 (§2 변동성)
  const vol = metrics.volatility * 100;
  if (vol > 30) {
    insights.push({ level: "warning", message: `${t}의 변동성이 ${vol.toFixed(1)}%로 높습니다. 고위험 자산입니다.`, relatedTicker: t });
  } else if (vol < 10) {
    insights.push({ level: "info", message: `${t}의 변동성이 ${vol.toFixed(1)}%로 안정적입니다.`, relatedTicker: t });
  }

  // MDD 기반 (§2 MDD)
  const mdd = Math.abs(metrics.mdd * 100);
  if (mdd > 20) {
    insights.push({ level: "danger", message: `${t}의 최대 낙폭이 -${mdd.toFixed(1)}%입니다. 하방 리스크에 유의하세요.`, relatedTicker: t });
  } else if (mdd < 5) {
    insights.push({ level: "success", message: `${t}의 최대 낙폭이 -${mdd.toFixed(1)}%로 방어력이 우수합니다.`, relatedTicker: t });
  }

  // 샤프 비율 기반 (§2 샤프)
  if (metrics.sharpe > 1.5) {
    insights.push({ level: "success", message: `${t}의 샤프 비율이 ${metrics.sharpe.toFixed(2)}로 위험 대비 수익이 우수합니다.`, relatedTicker: t });
  } else if (metrics.sharpe < 0) {
    insights.push({ level: "danger", message: `${t}의 샤프 비율이 음수입니다. 무위험 자산 대비 수익이 부족합니다.`, relatedTicker: t });
  }

  return insights;
}

// §3 포트폴리오 인사이트
export function generatePortfolioInsights(
  avgCorrelation: number,
  sectorWeights: Record<string, number>,
  etfWeights: Record<string, number>
): Insight[] {
  const insights: Insight[] = [];

  // 분산 효과
  if (avgCorrelation > 0.7) {
    insights.push({ level: "warning", message: "포트폴리오 내 자산 간 상관관계가 높아 분산 효과가 제한적입니다." });
  } else if (avgCorrelation < 0.3) {
    insights.push({ level: "success", message: "자산 간 낮은 상관관계로 분산 투자 효과가 우수합니다." });
  }

  // 집중 리스크
  for (const [sector, weight] of Object.entries(sectorWeights)) {
    if (weight > 0.5) {
      insights.push({ level: "danger", message: `${sector} 섹터 비중이 ${(weight * 100).toFixed(0)}%로 과도합니다. 섹터 분산을 고려하세요.` });
    }
  }
  for (const [ticker, weight] of Object.entries(etfWeights)) {
    if (weight > 0.4) {
      insights.push({ level: "warning", message: `${ticker} 비중이 ${(weight * 100).toFixed(0)}%로 높습니다. 종목 집중 리스크에 유의하세요.`, relatedTicker: ticker });
    }
  }

  return insights;
}

// §4 섹터 비교 인사이트
export function generateSectorInsights(
  sectorReturns: { sector: string; return3m: number }[]
): Insight[] {
  const insights: Insight[] = [];
  const sorted = [...sectorReturns].sort((a, b) => b.return3m - a.return3m);

  if (sorted.length > 0) {
    const best = sorted[0];
    insights.push({ level: "success", message: `${best.sector} 섹터가 최근 3개월 ${(best.return3m * 100).toFixed(1)}% 수익률로 섹터 중 1위입니다.` });

    const worst = sorted[sorted.length - 1];
    insights.push({ level: "danger", message: `${worst.sector} 섹터가 최근 3개월 ${(worst.return3m * 100).toFixed(1)}% 수익률로 부진합니다.` });
  }

  // 섹터 간 편차
  const returns = sectorReturns.map((s) => s.return3m);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
  if (std > 0.15) {
    insights.push({ level: "info", message: "섹터 간 수익률 격차가 크며, 섹터 로테이션 기회가 있을 수 있습니다." });
  }

  return insights;
}

// §6 인사이트 정렬 (우선순위)
const LEVEL_PRIORITY: Record<InsightLevel, number> = {
  danger: 0,
  warning: 1,
  success: 2,
  info: 3,
};

export function sortInsights(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level]);
}

export function topInsights(insights: Insight[], max = 5): Insight[] {
  return sortInsights(insights).slice(0, max);
}
