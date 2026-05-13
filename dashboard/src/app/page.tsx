// 메인 대시보드 — 멀티 에셋 뷰 (v3+universe+persona)
// MASTER_SKILL.md 8절: URL ?persona= 로 페르소나 분기 (기본값 global_investor)

import { loadAllAssets, loadUniverse } from "@/lib/load-server-data";
import { computeMetrics, dailyReturns, correlation, krwAdjustedReturn } from "@/lib/analysis-engine";
import {
  generateCrossAssetInsights,
  generatePersonaInsights,
  sortInsights,
  topInsights,
  type PersonaType,
} from "@/lib/insight-generator";
import type { Insight, AssetType } from "@/types";
import { ASSET_CLASS_LABELS } from "@/types";
import MultiAssetDashboard from "@/components/dashboard/MultiAssetDashboard";

const VALID_PERSONAS = new Set<PersonaType>(["global_investor", "crypto_hybrid", "defensive"]);

function parsePersona(raw: string | undefined): PersonaType {
  if (raw && VALID_PERSONAS.has(raw as PersonaType)) return raw as PersonaType;
  return "global_investor"; // 한국 대회 맥락 기본값
}

interface PageProps {
  searchParams: Promise<{ persona?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const persona = parsePersona(sp.persona);

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
  const usdkrw = assets.find((a) => a.ticker === "USDKRW=X");

  let stockBondCorr: number | undefined;
  let btcStockCorr: number | undefined;
  let goldStockCorr: number | undefined;
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
  if (spy && gld) {
    const spyRet = dailyReturns(spy.data.slice(-252));
    const gldRet = dailyReturns(gld.data.slice(-252));
    goldStockCorr = correlation(spyRet, gldRet);
  }
  if (gld) {
    const gldM = computeMetrics("GLD", "commodity", gld.data, 0.04);
    goldDown3m = gldM.returnPeriod["3M"] < 0;
  }

  // 6절 크로스 에셋 인사이트 자동 생성
  const crossInsights = generateCrossAssetInsights({
    classMeans,
    stockBondCorr,
    btcStockCorr,
    equityUp3m,
    goldDown3m,
    rateUp3m,
  });

  // 8절 페르소나별 맞춤 인사이트 — MASTER_SKILL.md 8절
  const personaParams: Parameters<typeof generatePersonaInsights>[1] = {};

  if (persona === "global_investor" && spy && usdkrw) {
    // SPY 1Y USD 수익률 vs KRW 환산 수익률
    const krw = krwAdjustedReturn(spy.data.slice(-252), usdkrw.data.slice(-252));
    personaParams.usdReturnPct = krw.usdReturn * 100;
    personaParams.krwReturnPct = krw.krwReturn * 100;
    // 달러 자산 비중 — 7개 미국 자산(SPY/QQQ/^GSPC/^IXIC/BTC/GLD/^TNX)이 전체 79개 중에서 차지하는 비율 추정
    const usdLikeCount = assets.filter((a) =>
      ["equity_etf", "crypto", "commodity", "index"].includes(a.assetType) &&
      !a.ticker.includes("=X") && !a.ticker.endsWith(".KS") && !a.ticker.endsWith(".KQ")
    ).length;
    personaParams.usdAssetRatioPct = (usdLikeCount / assets.length) * 100;
  }

  if (persona === "crypto_hybrid" && btc) {
    // BTC 30D / 90D 수익률
    const btc30 = btc.data.slice(-30);
    const btc90 = btc.data.slice(-90);
    personaParams.btcReturn30d = btc30.length >= 2 ? btc30[btc30.length - 1].close / btc30[0].close - 1 : 0;
    personaParams.btcReturn90d = btc90.length >= 2 ? btc90[btc90.length - 1].close / btc90[0].close - 1 : 0;
    // 크립토 변동성 (N=365)
    const btcData = btc.data.slice(-365);
    const btcDr: number[] = [];
    for (let i = 1; i < btcData.length; i++) btcDr.push(btcData[i].close / btcData[i - 1].close - 1);
    const meanDr = btcDr.reduce((s, v) => s + v, 0) / btcDr.length;
    const btcVol = Math.sqrt(btcDr.reduce((s, r) => s + (r - meanDr) ** 2, 0) / (btcDr.length - 1)) * Math.sqrt(365);
    personaParams.cryptoVol = btcVol;
    personaParams.cryptoStockCorr = btcStockCorr;
    // 전체 자산 중 crypto 비중
    const cryptoCount = assets.filter((a) => a.assetType === "crypto").length;
    personaParams.cryptoRatioPct = (cryptoCount / assets.length) * 100;
  }

  if (persona === "defensive") {
    // 전체 자산 평균 MDD (대시보드 전체 포트폴리오 proxy)
    let totalMdd = 0;
    let totalSharpe = 0;
    let count = 0;
    for (const a of assets) {
      const m = computeMetrics(a.ticker, a.assetType, a.data, 0.04);
      totalMdd += m.mdd;
      totalSharpe += m.sharpe;
      count++;
    }
    personaParams.portfolioMdd = count > 0 ? totalMdd / count : 0;
    personaParams.portfolioSharpe = count > 0 ? totalSharpe / count : 0;
    // 채권 비중
    const bondCount = assets.filter((a) => a.assetType === "bond").length;
    personaParams.bondRatioPct = (bondCount / assets.length) * 100;
    personaParams.goldStockCorr = goldStockCorr;
  }

  const personaInsights = generatePersonaInsights(persona, personaParams);

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

  // 9절 정렬: 페르소나 인사이트가 매크로·크로스에셋보다 우선
  const allInsights = sortInsights([
    ...personaInsights,
    ...crossInsights,
    ...extraInsights,
  ]);

  return (
    <MultiAssetDashboard
      assets={assets}
      universe={universe}
      insights={topInsights(allInsights, 6)}
      persona={persona}
    />
  );
}
