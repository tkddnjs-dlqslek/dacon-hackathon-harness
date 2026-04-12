// 메인 대시보드 — 멀티 에셋 뷰 (v3+universe)

import { loadAllAssets, loadUniverse } from "@/lib/load-server-data";
import { computeMetrics, dailyReturns, correlation } from "@/lib/analysis-engine";
import { sortInsights, topInsights } from "@/lib/insight-generator";
import type { Insight, AssetType } from "@/types";
import { ASSET_CLASS_LABELS } from "@/types";
import MultiAssetDashboard from "@/components/dashboard/MultiAssetDashboard";

export default async function DashboardPage() {
  const [assets, universe] = await Promise.all([
    loadAllAssets(),
    loadUniverse(),
  ]);

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

  // 인사이트 생성 (한글)
  const insights: Insight[] = [];

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
        message: `${ASSET_CLASS_LABELS[worst.type]} 자산이 ${(worst.mean * 100).toFixed(1)}%로 부진합니다. 노출도 점검이 필요합니다.`,
        relatedAssetType: worst.type,
      });
    }
  }

  if (classMeans.length >= 2) {
    const spread = (classMeans[0].mean - classMeans[classMeans.length - 1].mean) * 100;
    if (spread > 30) {
      insights.push({
        level: "info",
        message: `자산 클래스 간 1년 수익률 격차가 ${spread.toFixed(0)}%p로 큽니다. 분산 투자 시 클래스별 비중 조절을 검토하세요.`,
      });
    }
  }

  // 크로스 에셋 상관관계
  const spy = assets.find((a) => a.ticker === "SPY");
  const tnx = assets.find((a) => a.ticker === "^TNX");
  if (spy && tnx) {
    const spyRet = dailyReturns(spy.data.slice(-63));
    const tnxRet = dailyReturns(tnx.data.slice(-63));
    const sbCorr = correlation(spyRet, tnxRet);
    if (sbCorr > 0.5) {
      insights.push({
        level: "warning",
        message: `주식(SPY)과 국채금리(10년)의 상관관계가 ${sbCorr.toFixed(2)}로 상승했습니다. 전통적 분산 효과가 약화되는 신호입니다.`,
      });
    }
  }

  const btc = assets.find((a) => a.ticker === "BTC-USD");
  if (spy && btc) {
    const spyRet = dailyReturns(spy.data.slice(-63));
    const btcRet = dailyReturns(btc.data.slice(-63));
    const bsCorr = correlation(spyRet, btcRet);
    if (bsCorr > 0.7) {
      insights.push({
        level: "info",
        message: `비트코인과 주식의 상관관계가 ${bsCorr.toFixed(2)}로 매우 높습니다. 분산 효과가 제한적입니다.`,
      });
    }
  }

  // S&P 500 유니버스에서 최고 수익률 종목 강조
  if (universe.length > 0) {
    const topStock = [...universe].sort((a, b) => b.metrics.return1Y - a.metrics.return1Y)[0];
    if (topStock && topStock.metrics.return1Y > 0.5) {
      insights.push({
        level: "success",
        message: `S&P 500 최고 수익률은 ${topStock.ticker}로 1년간 ${(topStock.metrics.return1Y * 100).toFixed(1)}% 상승했습니다.`,
      });
    }
  }

  return (
    <MultiAssetDashboard
      assets={assets}
      universe={universe}
      insights={topInsights(sortInsights(insights), 5)}
    />
  );
}
