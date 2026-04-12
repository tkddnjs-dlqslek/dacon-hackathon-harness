"use client";

import { useState, useMemo } from "react";
import { CumulativeReturnChart, SectorBarChart } from "@/components/charts";
import type { Asset, OHLCV, AssetType, Insight } from "@/types";
import { ASSET_CLASS_COLORS, ASSET_CLASS_LABELS } from "@/types";

interface Props {
  assets: Asset[];
  insights: Insight[];
}

const PERIODS = [
  { label: "1M", days: 21 },
  { label: "3M", days: 63 },
  { label: "6M", days: 126 },
  { label: "1Y", days: 252 },
  { label: "ALL", days: 0 },
];

const ASSET_TYPES: AssetType[] = ["equity_etf", "bond", "fx", "commodity", "crypto", "index"];

function calcMetrics(data: OHLCV[]) {
  if (data.length < 2) return { ret: 0, vol: 0, mdd: 0 };
  const ret = data[data.length - 1].close / data[0].close - 1;
  const dr: number[] = [];
  for (let i = 1; i < data.length; i++) dr.push(data[i].close / data[i - 1].close - 1);
  const mean = dr.reduce((a, b) => a + b, 0) / dr.length;
  const vol = Math.sqrt(dr.reduce((s, r) => s + (r - mean) ** 2, 0) / (dr.length - 1)) * Math.sqrt(252);
  let peak = data[0].close, mdd = 0;
  for (const d of data) { if (d.close > peak) peak = d.close; const dd = (d.close - peak) / peak; if (dd < mdd) mdd = dd; }
  return { ret, vol, mdd };
}

// 일간 수익률
function dailyReturns(data: OHLCV[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < data.length; i++) r.push(data[i].close / data[i - 1].close - 1);
  return r;
}

// 피어슨 상관
function corr(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  const A = a.slice(-n), B = b.slice(-n);
  const mA = A.reduce((s, v) => s + v, 0) / n;
  const mB = B.reduce((s, v) => s + v, 0) / n;
  let cov = 0, vA = 0, vB = 0;
  for (let i = 0; i < n; i++) {
    cov += (A[i] - mA) * (B[i] - mB);
    vA += (A[i] - mA) ** 2;
    vB += (B[i] - mB) ** 2;
  }
  const denom = Math.sqrt(vA * vB);
  return denom === 0 ? 0 : cov / denom;
}

const insightColors: Record<string, string> = {
  danger: "border-red-800 bg-red-950 text-red-300",
  warning: "border-yellow-800 bg-yellow-950 text-yellow-300",
  success: "border-green-800 bg-green-950 text-green-300",
  info: "border-blue-800 bg-blue-950 text-blue-300",
};
const insightLabels: Record<string, string> = { danger: "ALERT", warning: "WARN", success: "GOOD", info: "INFO" };

export default function MultiAssetDashboard({ assets, insights }: Props) {
  const [periodIdx, setPeriodIdx] = useState(3); // 1Y
  const [selectedTypes, setSelectedTypes] = useState<Set<AssetType>>(new Set(ASSET_TYPES));

  const period = PERIODS[periodIdx];

  const toggleType = (t: AssetType) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(t)) newSet.delete(t);
    else newSet.add(t);
    setSelectedTypes(newSet);
  };

  // 자산 클래스 대표 티커 (크로스 에셋 분석용)
  const REPRESENTATIVES: Record<AssetType, string> = {
    equity_etf: "SPY",
    bond: "^TNX",
    fx: "USDKRW=X",
    commodity: "GLD",
    crypto: "BTC-USD",
    index: "^GSPC",
  };

  const filtered = useMemo(() => {
    const slice = (data: OHLCV[]) => period.days === 0 ? data : data.slice(-period.days);
    return assets
      .filter((a) => selectedTypes.has(a.assetType))
      .map((a) => ({ ...a, sliced: slice(a.data) }));
  }, [assets, selectedTypes, period]);

  // 자산 클래스별 평균 수익률
  const classReturns = useMemo(() => {
    return ASSET_TYPES.map((t) => {
      const ofType = filtered.filter((a) => a.assetType === t);
      if (ofType.length === 0) return { type: t, label: ASSET_CLASS_LABELS[t], ret: 0, count: 0 };
      const rets = ofType.map((a) => calcMetrics(a.sliced).ret);
      const avg = rets.reduce((s, r) => s + r, 0) / rets.length;
      return { type: t, label: ASSET_CLASS_LABELS[t], ret: avg, count: ofType.length };
    }).filter((c) => c.count > 0);
  }, [filtered]);

  // 크로스 에셋 상관 행렬 (대표 티커 간)
  const crossCorr = useMemo(() => {
    const reps = ASSET_TYPES
      .filter((t) => selectedTypes.has(t))
      .map((t) => {
        const a = assets.find((x) => x.ticker === REPRESENTATIVES[t]);
        if (!a) return null;
        const sliced = period.days === 0 ? a.data : a.data.slice(-period.days);
        return { type: t, ticker: a.ticker, returns: dailyReturns(sliced) };
      })
      .filter(Boolean) as { type: AssetType; ticker: string; returns: number[] }[];

    const matrix: number[][] = reps.map((r1) => reps.map((r2) => corr(r1.returns, r2.returns)));
    return { reps, matrix };
  }, [assets, selectedTypes, period]);

  // 누적 수익률 차트 데이터 (대표 티커만)
  const chartData = useMemo(() => {
    const reps = ASSET_TYPES
      .filter((t) => selectedTypes.has(t))
      .map((t) => assets.find((a) => a.ticker === REPRESENTATIVES[t]))
      .filter(Boolean) as Asset[];

    if (reps.length === 0) return { dates: [], series: [] };

    const sliced = reps.map((a) => period.days === 0 ? a.data : a.data.slice(-period.days));
    const minLen = Math.min(...sliced.map((s) => s.length));
    const dates = sliced[0].slice(-minLen).map((d) => d.date);

    const series = reps.map((a, i) => {
      const data = sliced[i].slice(-minLen);
      const base = data[0]?.close ?? 1;
      return {
        ticker: a.name,
        sector: ASSET_CLASS_LABELS[a.assetType],
        cumulativeReturns: data.map((d) => d.close / base - 1),
      };
    });

    return { dates, series };
  }, [assets, selectedTypes, period]);

  const totalAssets = filtered.length;
  const positiveCount = filtered.filter((a) => calcMetrics(a.sliced).ret > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Multi-Asset Dashboard</h1>
        <div className="flex gap-1">
          {PERIODS.map((p, i) => (
            <button key={p.label} onClick={() => setPeriodIdx(i)}
              className={`rounded px-3 py-1 text-sm ${i === periodIdx ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 자산 클래스 필터 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Asset Classes:</span>
          {ASSET_TYPES.map((t) => {
            const isOn = selectedTypes.has(t);
            return (
              <button key={t} onClick={() => toggleType(t)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  isOn
                    ? "border-transparent text-white"
                    : "border-gray-700 text-gray-500 hover:text-gray-300"
                }`}
                style={isOn ? { backgroundColor: ASSET_CLASS_COLORS[t] } : undefined}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[t] }} />
                {ASSET_CLASS_LABELS[t]}
              </button>
            );
          })}
        </div>
      </section>

      {/* 인사이트 배너 */}
      <section className="flex gap-3 overflow-x-auto pb-2">
        {insights.map((ins, i) => (
          <div key={i} className={`min-w-[260px] rounded-lg border p-4 ${insightColors[ins.level]}`}>
            <span className="text-xs font-bold opacity-70">{insightLabels[ins.level]}</span>
            <p className="mt-1 text-sm">{ins.message}</p>
          </div>
        ))}
      </section>

      {/* 요약 KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">Tracked Assets</p>
          <p className="mt-1 text-2xl font-bold">{totalAssets}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">Asset Classes</p>
          <p className="mt-1 text-2xl font-bold">{selectedTypes.size}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">Positive ({period.label})</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{positiveCount}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">Negative ({period.label})</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{totalAssets - positiveCount}</p>
        </div>
      </div>

      {/* 자산 클래스별 평균 수익률 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">Asset Class Performance ({period.label})</h2>
        <div className="space-y-2">
          {classReturns.sort((a, b) => b.ret - a.ret).map((c) => (
            <div key={c.type} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: ASSET_CLASS_COLORS[c.type] }} />
              <span className="w-32 text-sm text-gray-300">{c.label}</span>
              <span className="w-12 text-xs text-gray-500">({c.count})</span>
              <div className="flex-1">
                <div
                  className={`h-5 rounded ${c.ret >= 0 ? "bg-green-600" : "bg-red-600"}`}
                  style={{ width: `${Math.min(Math.abs(c.ret * 100) * 2, 100)}%` }}
                />
              </div>
              <span className={`w-16 text-right text-sm font-mono ${c.ret >= 0 ? "text-green-400" : "text-red-400"}`}>
                {(c.ret * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 대표 자산 누적 수익률 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">Cross-Asset Performance — Representative Tickers</h2>
        {chartData.dates.length > 0 && (
          <CumulativeReturnChart dates={chartData.dates} series={chartData.series} />
        )}
      </section>

      {/* 크로스 에셋 상관 매트릭스 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">Cross-Asset Correlation Matrix</h2>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th />
                {crossCorr.reps.map((r) => (
                  <th key={r.ticker} className="px-2 py-1 text-center text-gray-400">{r.ticker}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crossCorr.reps.map((r, i) => (
                <tr key={r.ticker}>
                  <td className="pr-2 text-right text-gray-400">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[r.type] }} />
                    {" "}{r.ticker}
                  </td>
                  {crossCorr.matrix[i].map((val, j) => {
                    const abs = Math.abs(val);
                    const r2 = val > 0 ? Math.round(abs * 220) : 50;
                    const b = val < 0 ? Math.round(abs * 220) : 50;
                    return (
                      <td key={j} className="px-2 py-1 text-center font-mono"
                        style={{ backgroundColor: `rgba(${r2},50,${b},${0.3 + abs * 0.5})`, color: abs > 0.5 ? "#fff" : "#aaa" }}>
                        {val.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          파랑: 양의 상관 / 빨강: 음의 상관 / 색상 강도: 절댓값
        </p>
      </section>

      {/* 전체 자산 테이블 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">All Assets ({totalAssets})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-xs text-gray-400">
              <tr>
                <th className="pb-2">Class</th>
                <th className="pb-2">Ticker</th>
                <th className="pb-2">Name</th>
                <th className="pb-2 text-right">{period.label} Return</th>
                <th className="pb-2 text-right">Volatility</th>
                <th className="pb-2 text-right">MDD</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .map((a) => ({ ...a, m: calcMetrics(a.sliced) }))
                .sort((a, b) => b.m.ret - a.m.ret)
                .map((a) => (
                  <tr key={a.ticker} className="border-b border-gray-800">
                    <td className="py-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[a.assetType] }} />
                      {" "}<span className="text-xs text-gray-500">{ASSET_CLASS_LABELS[a.assetType]}</span>
                    </td>
                    <td className="py-2 font-mono font-bold">{a.ticker}</td>
                    <td className="py-2 text-gray-400">{a.name}</td>
                    <td className={`py-2 text-right font-mono ${a.m.ret >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {(a.m.ret * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-right font-mono text-gray-300">{(a.m.vol * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right font-mono text-red-400">{(a.m.mdd * 100).toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
