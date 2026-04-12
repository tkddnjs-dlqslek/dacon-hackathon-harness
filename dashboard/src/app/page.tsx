// 메인 대시보드 — 멀티 에셋 뷰 (v3)

import { loadAllAssets } from "@/lib/load-server-data";
import { computeMetrics, dailyReturns, correlation } from "@/lib/analysis-engine";
import { generateETFInsights, sortInsights, topInsights } from "@/lib/insight-generator";
import type { Insight, AssetType } from "@/types";
import { ASSET_CLASS_LABELS } from "@/types";
import MultiAssetDashboard from "@/components/dashboard/MultiAssetDashboard";

export default async function DashboardPage() {
  const assets = await loadAllAssets();

  // 자산 클래스별 1Y 평균 수익률 계산
  const classAvg: Record<AssetType, number[]> = {
    equity_etf: [], bond: [], fx: [], commodity: [], crypto: [], index: [],
  };
  for (const a of assets) {
    const m = computeMetrics(a.ticker, a.assetType, a.data, 0.04);
    classAvg[a.assetType].push(m.returnPeriod["1Y"]);
  }

  const classMeans = (Object.entries(classAvg) as [AssetType, number[]][])
    .filter(([, arr]) => arr.length > 0)
    .map(([type, arr]) => ({ type, mean: arr.reduce((s, v) => s + v, 0) / arr.length }))
    .sort((a, b) => b.mean - a.mean);

  // 인사이트 생성
  const insights: Insight[] = [];

  // 1. 최고/최저 자산 클래스
  if (classMeans.length > 0) {
    const best = classMeans[0];
    insights.push({
      level: "success",
      message: `최근 1년간 ${ASSET_CLASS_LABELS[best.type]} 자산이 ${(best.mean * 100).toFixed(1)}% 평균 수익률로 가장 우수한 성과를 보였습니다.`,
      relatedAssetType: best.type,
    });
    const worst = classMeans[classMeans.length - 1];
    if (worst.mean < -0.05) {
      insights.push({
        level: "danger",
        message: `${ASSET_CLASS_LABELS[worst.type]} 자산이 ${(worst.mean * 100).toFixed(1)}% 부진. 노출도 점검 필요.`,
        relatedAssetType: worst.type,
      });
    }
  }

  // 2. 자산 클래스 간 격차
  if (classMeans.length >= 2) {
    const spread = (classMeans[0].mean - classMeans[classMeans.length - 1].mean) * 100;
    if (spread > 30) {
      insights.push({
        level: "info",
        message: `자산 클래스 간 1Y 수익률 격차가 ${spread.toFixed(0)}%p로 매우 큽니다. 분산 투자 시 클래스별 비중 조절 검토 필요.`,
      });
    }
  }

  // 3. 크로스 에셋 상관관계 — 주식-채권
  const spy = assets.find((a) => a.ticker === "SPY");
  const tnx = assets.find((a) => a.ticker === "^TNX");
  if (spy && tnx) {
    const spyRet = dailyReturns(spy.data.slice(-63));
    const tnxRet = dailyReturns(tnx.data.slice(-63));
    const sbCorr = correlation(spyRet, tnxRet);
    if (sbCorr > 0.5) {
      insights.push({
        level: "warning",
        message: `주식(SPY)과 국채금리(^TNX) 상관관계가 ${sbCorr.toFixed(2)}로 상승. 전통적 분산 효과 약화 신호.`,
      });
    }
  }

  // 4. 암호화폐-주식 상관
  const btc = assets.find((a) => a.ticker === "BTC-USD");
  if (spy && btc) {
    const spyRet = dailyReturns(spy.data.slice(-63));
    const btcRet = dailyReturns(btc.data.slice(-63));
    const bsCorr = correlation(spyRet, btcRet);
    if (bsCorr > 0.7) {
      insights.push({
        level: "info",
        message: `BTC와 주식 상관관계가 ${bsCorr.toFixed(2)}로 매우 높음. 분산 효과 제한적.`,
      });
    }
  }

  // 5. 개별 자산 최고 성과자 (리스크 지표 포함)
  const allMetrics = assets.map((a) => ({
    asset: a,
    metrics: computeMetrics(a.ticker, a.assetType, a.data, 0.04),
  }));
  const topGainer = [...allMetrics].sort((a, b) => b.metrics.returnPeriod["1Y"] - a.metrics.returnPeriod["1Y"])[0];
  if (topGainer && topGainer.metrics.returnPeriod["1Y"] > 0.2) {
    insights.push(...generateETFInsights(topGainer.metrics));
  }

  return (
    <MultiAssetDashboard
      assets={assets}
      insights={topInsights(sortInsights(insights), 5)}
    />
  );
}
