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

// 자산 타입별 지표 계산 (프로파일 기반)
function computeProfileMetrics(asset: Asset, profile: typeof ASSET_PROFILES[AssetType], allAssets: Asset[]) {
  const data = asset.data;
  const sliced = data.slice(-252); // 1Y
  if (sliced.length < 2) return {};

  const result: Record<string, number | string> = {};
  const ret = sliced[sliced.length - 1].close / sliced[0].close - 1;
  const vol = volatility(sliced);
  const mdd = maxDrawdown(sliced);

  // 공통
  result.return = ret;
  result.volatility = vol;
  result.mdd = mdd;

  // 자산 타입별 분기 (Skills.md §3 기반)
  switch (profile.type) {
    case "equity_etf": {
      const annRet = Math.pow(1 + ret, 252 / sliced.length) - 1;
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
  const assets = allAssets.filter((a) => a.assetType === assetType);

  if (assets.length === 0) {
    return <div className="py-12 text-center text-gray-500">No data for {profile.label}</div>;
  }

  const color = ASSET_CLASS_COLORS[assetType];

  // 누적 수익률 차트 데이터
  const minLen = Math.min(...assets.map((a) => a.data.length));
  const chartDates = assets[0].data.slice(-minLen).map((d) => d.date);
  const chartSeries = assets.map((a) => {
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
      <div className="text-sm text-gray-400">
        대시보드 &gt;{" "}
        <span className="text-white">{profile.label}</span>
      </div>

      {/* 헤더 */}
      <header className="rounded-lg border-2 p-6" style={{ borderColor: color, backgroundColor: `${color}10` }}>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: color }} />
          <h1 className="text-2xl font-bold">{profile.label}</h1>
          <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">{assets.length}개 자산</span>
        </div>
        <p className="mt-2 text-sm text-gray-400">{profile.description}</p>
        <p className="mt-1 text-xs text-gray-500">
          표시 모드: <span className="font-mono">{profile.valueMode}</span> · 표시 단위: {profile.valueLabel}
          {profile.valueUnit && ` (${profile.valueUnit})`}
        </p>
      </header>

      {/* 자산 타입별 적용 지표 (Skills 기반) */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-400">적용 가능한 지표 (data-analysis.md §3 기반)</h2>
        <div className="flex flex-wrap gap-2">
          {profile.metrics.map((m) => (
            <span key={m.key} className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">
              {m.label}
              {m.unit && <span className="ml-1 text-gray-500">[{m.unit}]</span>}
            </span>
          ))}
        </div>
      </section>

      {/* 누적 수익률 차트 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">
          {profile.valueMode === "yield" ? "금리 변화 (1년)" : "누적 수익률 (1년)"}
        </h2>
        <CumulativeReturnChart dates={chartDates} series={chartSeries} />
      </section>

      {/* 자산 테이블 — 프로파일에 정의된 지표만 표시 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">자산별 지표 (자산 타입 특화)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-xs text-gray-400">
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
                <tr key={asset.ticker} className="border-b border-gray-800">
                  <td className="py-2 font-mono font-bold">{asset.ticker}</td>
                  <td className="py-2 text-gray-400">{asset.name}</td>
                  {profile.metrics.map((m) => {
                    const value = metrics[m.key];
                    const formatted = formatMetricValue(m.key, value, m.unit);
                    const isNumber = typeof value === "number";
                    const colorClass =
                      isNumber && m.key === "return" ? (value as number) >= 0 ? "text-green-400" : "text-red-400"
                      : isNumber && m.key === "mdd" ? "text-red-400"
                      : isNumber && (m.key === "sharpe" || m.key === "inflationHedge") ? (value as number) > 1 ? "text-green-400" : "text-gray-300"
                      : "text-gray-300";
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
      <section className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs text-gray-500">
        <p>
          <span className="text-gray-400">규칙 출처:</span>{" "}
          이 페이지의 지표 선택은 <code className="text-blue-400">skills/data-analysis.md §3.{profile.type === "equity_etf" ? "1" : profile.type === "bond" ? "2" : profile.type === "fx" ? "3" : profile.type === "commodity" ? "4" : profile.type === "crypto" ? "5" : "6"}</code> ({profile.label})에서 정의되었습니다.
          분석 모드: <code className="text-blue-400">{profile.valueMode}</code>.
        </p>
      </section>
    </div>
  );
}
