// 메인 대시보드 — 멀티 에셋 뷰 (v3+universe)

import { loadAllAssets, loadUniverse } from "@/lib/load-server-data";
import { computeMetrics, dailyReturns, correlation } from "@/lib/analysis-engine";
import { generateCrossAssetInsights, sortInsights, topInsights } from "@/lib/insight-generator";
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
    .map(([type, arr]) => ({
      type,
      label: ASSET_CLASS_LABELS[type],
      mean: arr.reduce((s, v) => s + v, 0) / arr.length,
    }))
    .sort((a, b) => b.mean - a.mean);

  // 크로스 에셋 상관관계 계산
  const spy = assets.find((a) => a.ticker === "SPY");
  const tnx = assets.find((a) => a.ticker === "^TNX");
  const btc = assets.find((a) => a.ticker === "BTC-USD");
  const gld = assets.find((a) => a.ticker === "GLD");

  let stockBondCorr: number | undefined;
  let btcStockCorr: number | undefined;
  let equityUp3m: boolean | undefined;
  let goldDown3m: boolean | undefined;
  let rateUp3m: boolean | undefined;

  if (spy && tnx) {
    const spyRet = dailyReturns(spy.data.slice(-63));
    const tnxRet = dailyReturns(tnx.data.slice(-63));
    stockBondCorr = correlation(spyRet, tnxRet);
    const spyM = computeMetrics("SPY", "equity_etf", spy.data, 0.04);
    const tnxM = computeMetrics("^TNX", "bond", tnx.data, 0.04);
    equityUp3m = spyM.returnPeriod["3M"] > 0;
    rateUp3m = tnxM.returnPeriod["3M"] > 0;
  }
  if (spy && btc) {
    const spyRet = dailyReturns(spy.data.slice(-63));
    const btcRet = dailyReturns(btc.data.slice(-63));
    btcStockCorr = correlation(spyRet, btcRet);
  }
  if (gld) {
    const gldM = computeMetrics("GLD", "commodity", gld.data, 0.04);
    goldDown3m = gldM.returnPeriod["3M"] < 0;
  }

  // §6 크로스 에셋 인사이트 자동 생성 — generateCrossAssetInsights() 호출
  const crossInsights = generateCrossAssetInsights({
    classMeans,
    stockBondCorr,
    btcStockCorr,
    equityUp3m,
    goldDown3m,
    rateUp3m,
  });

  // 부진 자산 경고 (추가)
  const extraInsights: Insight[] = [];
  if (classMeans.length > 0) {
    const worst = classMeans[classMeans.length - 1];
    if (worst.mean < -0.05) {
      extraInsights.push({
        level: "danger",
        message: `${worst.label} 자산이 ${(worst.mean * 100).toFixed(1)}%로 부진합니다. 노출도 점검이 필요합니다.`,
        relatedAssetType: worst.type as AssetType,
      });
    }
  }

  // S&P 500 유니버스 최고 수익률 종목 강조
  if (universe.length > 0) {
    const topStock = [...universe].sort((a, b) => b.metrics.return1Y - a.metrics.return1Y)[0];
    if (topStock && topStock.metrics.return1Y > 0.5) {
      extraInsights.push({
        level: "success",
        message: `S&P 500 최고 수익률은 ${topStock.ticker}로 1년간 ${(topStock.metrics.return1Y * 100).toFixed(1)}% 상승했습니다.`,
      });
    }
  }

  return (
    <MultiAssetDashboard
      assets={assets}
      universe={universe}
      insights={topInsights(sortInsights([...crossInsights, ...extraInsights]), 5)}
    />
  );
}
