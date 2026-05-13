// 자산 클래스별 깊이 분석 (/asset-class/[type])
// 자산 타입 프로파일에 따라 지표·해석이 자동으로 달라짐

import { loadAllAssets } from "@/lib/load-server-data";
import { dailyReturns, volatility, maxDrawdown, correlation, cumulativeReturns } from "@/lib/analysis-engine";
import { ASSET_PROFILES, SLUG_TO_TYPE } from "@/lib/asset-profiles";
import { CumulativeReturnChart } from "@/components/charts";
import { ASSET_CLASS_COLORS, ASSET_CLASS_LABELS } from "@/types";
import type { Asset, AssetType, OHLCV } from "@/types";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ type: string }>;
}

const METRIC_TOOLTIPS: Record<string, string> = {
  return: "기간 수익률: (현재가 − 시작가) / 시작가",
  volatility: "연환산 변동성: 일간 수익률 표준편차 × √N (주식·채권·외환·원자재·지수는 N=252, 암호화폐는 N=365 — 24/7 거래)",
  mdd: "최대 낙폭(MDD): 고점 대비 최대 하락률. −20%이면 고점에서 20% 하락한 적 있다는 뜻",
  sharpe: "샤프 비율: (수익률 − 무위험이자율) / 변동성. 1.0 이상이면 위험 대비 수익이 양호",
  beta: "베타: 시장(S&P 500) 대비 민감도. 1.0 = 시장과 동일 움직임, 2.0 = 시장 2배 변동",
  currentYield: "채권 수익률: 현재 만기 수익률 (%)",
  yieldChange: "금리 변화: 1년간 금리 변화량 (베이시스 포인트, 100bps = 1%)",
  rateChange: "환율 변화율: 1년간 환율 등락 비율",
  range52w: "52주 범위: 최근 1년간 최저가 ~ 최고가 구간",
  stockCorr: "주식 상관계수: S&P 500과의 상관도 (−1~+1). 0에 가까울수록 분산 효과 높음",
  inflationHedge: "인플레이션 헤지 점수: 주식과 음의 상관 → 인플레이션 방어 효과",
  btcCorr: "BTC 상관계수: 비트코인과의 동조화 정도",
  globalCorr: "글로벌 상관계수: S&P 500과의 동조화 정도",
};

// 자산 타입별 지표 계산 (프로파일 기반)
// data-analysis.md 1.3절: crypto는 24/7 거래 → 1Y = 365일, 그 외 = 252일
function computeProfileMetrics(asset: Asset, profile: typeof ASSET_PROFILES[AssetType], allAssets: Asset[]) {
  const data = asset.data;
  const N = asset.assetType === "crypto" ? 365 : 252;
  const sliced = data.slice(-N); // 1Y
  if (sliced.length < 2) return {};

  const result: Record<string, number | string> = {};
  const ret = sliced[sliced.length - 1].close / sliced[0].close - 1;
  const vol = volatility(sliced, asset.assetType);
  const mdd = maxDrawdown(sliced);

  // 공통
  result.return = ret;
  result.volatility = vol;
  result.mdd = mdd;

  // 자산 타입별 분기 (Skills.md 3절 기반)
  switch (profile.type) {
    case "equity_etf": {
      const annRet = Math.pow(1 + ret, N / sliced.length) - 1;
      result.sharpe = vol === 0 ? 0 : (annRet - 0.04) / vol;
      const spy = allAssets.find((a) => a.ticker === "SPY");
      if (spy) {
        const aRet = dailyReturns(sliced);
        const bRet = dailyReturns(spy.data.slice(-sliced.length));
        const meanA = aRet.reduce((s, v) => s + v, 0) / aRet.length;
        const meanB = bRet.reduce((s, v) => s + v, 0) / bRet.length;
        let cov = 0, varB = 0;
        for (let i = 0; i < Math.min(aRet.length, bRet.length); i++) {
          cov += (aRet[i] - meanA) * (bRet[i] - meanB);
          varB += (bRet[i] - meanB) ** 2;
        }
        result.beta = varB === 0 ? 0 : cov / varB;
      }
      break;
    }

    case "bond": {
      // 채권은 가격이 아닌 yield. close가 % 자체.
      const currentYield = sliced[sliced.length - 1].close;
      const startYield = sliced[0].close;
      result.currentYield = currentYield / 100; // % → 소수
      result.yieldChange = (currentYield - startYield) * 100; // basis points
      break;
    }

    case "fx": {
      result.rateChange = ret;
      const high = Math.max(...sliced.map((d) => d.close));
      const low = Math.min(...sliced.map((d) => d.close));
      result.range52w = `${low.toFixed(4)} ~ ${high.toFixed(4)}`;
      break;
    }

    case "commodity": {
      const spy = allAssets.find((a) => a.ticker === "SPY");
      if (spy) {
        const aRet = dailyReturns(sliced);
        const bRet = dailyReturns(spy.data.slice(-sliced.length));
        result.stockCorr = correlation(aRet, bRet);
        result.inflationHedge = -correlation(aRet, bRet); // 음의 상관 → 헤지 가치
      }
      break;
    }

    case "crypto": {
      const btc = allAssets.find((a) => a.ticker === "BTC-USD");
      const spy = allAssets.find((a) => a.ticker === "SPY");
      const aRet = dailyReturns(sliced);
      if (btc) {
        const bRet = dailyReturns(btc.data.slice(-sliced.length));
        result.btcCorr = correlation(aRet, bRet);
      }
      if (spy) {
        const sRet = dailyReturns(spy.data.slice(-sliced.length));
        result.stockCorr = correlation(aRet, sRet);
      }
      break;
    }

    case "index": {
      const gspc = allAssets.find((a) => a.ticker === "^GSPC");
      if (gspc && asset.ticker !== "^GSPC") {
        const aRet = dailyReturns(sliced);
        const bRet = dailyReturns(gspc.data.slice(-sliced.length));
        result.globalCorr = correlation(aRet, bRet);
      }
      break;
    }
  }

  return result;
}

function formatMetricValue(key: string, value: unknown, unit?: string): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  if (typeof value !== "number") return "—";
  if (unit === "%") return `${(value * 100).toFixed(2)}%`;
  if (unit === "bps") return `${value.toFixed(0)} bps`;
  if (unit === "ratio") return value.toFixed(2);
  if (unit === "$") return `$${value.toFixed(2)}`;
  return value.toFixed(2);
}

export default async function AssetClassPage({ params }: PageProps) {
  const { type: typeSlug } = await params;
  const assetType = SLUG_TO_TYPE[typeSlug];

  if (!assetType) notFound();

  const profile = ASSET_PROFILES[assetType];
  const allAssets = await loadAllAssets();
  // .KS/.KQ 한국 종목 제외, 비표준 티커 제외
  const assets = allAssets.filter((a) => a.assetType === assetType && !a.ticker.includes("."));

  if (assets.length === 0) {
    return <div className="py-12 text-center text-gray-500">{ASSET_CLASS_LABELS[assetType]} 데이터가 없습니다.</div>;
  }

  const color = ASSET_CLASS_COLORS[assetType];

  // 누적 수익률 차트 — equity_etf는 ETF만(XL*, SPY, QQQ 등), 최대 12개
  const isEquity = assetType === "equity_etf";
  const ETF_PREFIXES = ["XL", "SPY", "QQQ", "DIA", "IWM", "VTI", "GLD", "SLV", "USO", "BTC", "ETH"];
  const chartAssets = isEquity
    ? assets.filter((a) => ETF_PREFIXES.some((p) => a.ticker.startsWith(p))).slice(0, 12)
    : assets.slice(0, 12);
  const minLen = Math.min(...chartAssets.map((a) => a.data.length));
  const chartDates = chartAssets[0].data.slice(-minLen).map((d) => d.date);
  const chartSeries = chartAssets.map((a) => {
    const sliced = a.data.slice(-minLen);
    const base = sliced[0]?.close ?? 1;
    return {
      ticker: a.ticker,
      sector: profile.label,
      // bond는 yield 변화로 표시 (가격이 아니라 수익률 자체이므로 단순 변화율)
      cumulativeReturns: profile.valueMode === "yield"
        ? sliced.map((d) => (d.close - base) / 100) // bps 변화를 소수로
        : sliced.map((d) => d.close / base - 1),
    };
  });

  const assetMetrics = assets.map((a) => ({
    asset: a,
    metrics: computeProfileMetrics(a, profile, allAssets),
  }));

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        대시보드 &gt;{" "}
        <span className="text-gray-900">{ASSET_CLASS_LABELS[assetType]}</span>
      </div>

      {/* 헤더 */}
      <header className="rounded-lg border-2 p-6" style={{ borderColor: color, backgroundColor: `${color}10` }}>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: color }} />
          <h1 className="text-2xl font-bold">{ASSET_CLASS_LABELS[assetType]}</h1>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">{assets.length}개 자산</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">{profile.description}</p>
        <p className="mt-1 text-xs text-gray-500">
          표시 모드: <span className="font-mono">{profile.valueMode === "price" ? "가격" : profile.valueMode === "yield" ? "수익률" : "환율"}</span> · 표시 단위: {profile.valueLabel}
          {profile.valueUnit && ` (${profile.valueUnit})`}
        </p>
      </header>

      {/* 자산 타입별 적용 지표 (Skills 기반) */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-500">적용 가능한 지표 (data-analysis.md 3절 기반)</h2>
        <p className="mb-2 text-xs text-gray-400">지표 위에 마우스를 올리면 설명이 표시됩니다.</p>
        <div className="flex flex-wrap gap-2">
          {profile.metrics.map((m) => (
            <span
              key={m.key}
              title={METRIC_TOOLTIPS[m.key]}
              className="cursor-help rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {m.label}
              {m.unit && <span className="ml-1 text-gray-400">[{m.unit}]</span>}
            </span>
          ))}
        </div>
      </section>

      {/* 누적 수익률 차트 */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-3 font-semibold">
          {profile.valueMode === "yield" ? "금리 변화 (1년)" : "누적 수익률 (1년)"}
        </h2>
        <CumulativeReturnChart dates={chartDates} series={chartSeries} />
      </section>

      {/* 자산 테이블 — 프로파일에 정의된 지표만 표시 */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-3 font-semibold">자산별 지표 (자산 타입 특화)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs text-gray-500">
              <tr>
                <th className="pb-2">종목</th>
                <th className="pb-2">이름</th>
                {profile.metrics.map((m) => (
                  <th key={m.key} className="pb-2 text-right">{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assetMetrics.map(({ asset, metrics }) => (
                <tr key={asset.ticker} className="border-b border-gray-200">
                  <td className="py-2 font-mono font-bold">{asset.ticker}</td>
                  <td className="py-2 text-gray-500">{asset.name}</td>
                  {profile.metrics.map((m) => {
                    const value = metrics[m.key];
                    const formatted = formatMetricValue(m.key, value, m.unit);
                    const isNumber = typeof value === "number";
                    const colorClass =
                      isNumber && m.key === "return" ? (value as number) >= 0 ? "text-green-400" : "text-red-400"
                      : isNumber && m.key === "mdd" ? "text-red-400"
                      : isNumber && (m.key === "sharpe" || m.key === "inflationHedge") ? (value as number) > 1 ? "text-green-400" : "text-gray-600"
                      : "text-gray-600";
                    return (
                      <td key={m.key} className={`py-2 text-right font-mono ${colorClass}`}>
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Skills.md 규칙 출처 */}
      <section className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-500">
        <p>
          <span className="text-gray-500">규칙 출처:</span>{" "}
          이 페이지의 지표 선택은 <code className="text-gray-600">skills/data-analysis.md 3.{profile.type === "equity_etf" ? "1" : profile.type === "bond" ? "2" : profile.type === "fx" ? "3" : profile.type === "commodity" ? "4" : profile.type === "crypto" ? "5" : "6"}절</code> ({ASSET_CLASS_LABELS[assetType]})에서 정의되었습니다.
          분석 모드: <code className="text-gray-600">{profile.valueMode}</code>.
        </p>
      </section>
    </div>
  );
}
