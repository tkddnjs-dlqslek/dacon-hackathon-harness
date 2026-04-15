"use client";

import { useState, useMemo } from "react";
import { CumulativeReturnChart } from "@/components/charts";
import type { Asset, OHLCV, AssetType, Insight, UniverseAsset } from "@/types";
import { ASSET_CLASS_COLORS, ASSET_CLASS_LABELS, T } from "@/types";
import { useSort } from "@/lib/use-sort";
import { SortIndicator } from "@/components/ui/SortIndicator";

interface Props {
  assets: Asset[];
  universe: UniverseAsset[];
  insights: Insight[];
}

const PERIODS = [
  { label: "1개월", days: 21 },
  { label: "3개월", days: 63 },
  { label: "6개월", days: 126 },
  { label: "1년", days: 252 },
  { label: "전체", days: 0 },
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

function dailyReturns(data: OHLCV[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < data.length; i++) r.push(data[i].close / data[i - 1].close - 1);
  return r;
}

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
const insightLabels: Record<string, string> = {
  danger: T.alert,
  warning: T.warn,
  success: T.good,
  info: T.info,
};

// 정렬 가능 전체 자산 테이블
type SortColumn = "ticker" | "name" | "ret" | "vol" | "mdd";

function SortableAllAssetsTable({
  filtered,
  periodLabel,
}: {
  filtered: (Asset & { sliced: OHLCV[] })[];
  periodLabel: string;
}) {
  const rows = filtered.map((a) => ({
    ticker: a.ticker,
    name: a.name,
    assetType: a.assetType,
    ...calcMetrics(a.sliced),
  }));

  const { sortedData, sort, handleSort } = useSort<(typeof rows)[number], SortColumn>(rows, "ret", "desc");

  const sortHeader = (label: string, col: SortColumn, align: "left" | "right" = "left") => (
    <th
      onClick={() => handleSort(col)}
      className={`pb-2 cursor-pointer hover:text-white ${align === "right" ? "text-right" : ""}`}
    >
      {label} <SortIndicator active={sort.column === col} direction={sort.direction} />
    </th>
  );

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 font-semibold">{T.allAssets} ({rows.length}개) <span className="ml-2 text-xs text-gray-500">컬럼 클릭하여 정렬</span></h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-700 text-xs text-gray-400">
            <tr>
              <th className="pb-2">{T.class}</th>
              {sortHeader(T.ticker, "ticker")}
              {sortHeader(T.name, "name")}
              {sortHeader(`${periodLabel} ${T.return}`, "ret", "right")}
              {sortHeader(T.volatility, "vol", "right")}
              {sortHeader(T.mdd, "mdd", "right")}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((a) => (
              <tr key={a.ticker} className="border-b border-gray-800">
                <td className="py-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[a.assetType] }} />
                  {" "}<span className="text-xs text-gray-500">{ASSET_CLASS_LABELS[a.assetType]}</span>
                </td>
                <td className="py-2 font-mono font-bold">{a.ticker}</td>
                <td className="py-2 text-gray-400">{a.name}</td>
                <td className={`py-2 text-right font-mono ${a.ret >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {(a.ret * 100).toFixed(1)}%
                </td>
                <td className="py-2 text-right font-mono text-gray-300">{(a.vol * 100).toFixed(1)}%</td>
                <td className="py-2 text-right font-mono text-red-400">{(a.mdd * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MultiAssetDashboard({ assets, universe, insights }: Props) {
  const [periodIdx, setPeriodIdx] = useState(3); // 1Y
  const [selectedTypes, setSelectedTypes] = useState<Set<AssetType>>(new Set(ASSET_TYPES));
  const [showUniverse, setShowUniverse] = useState(false);
  const [universeSearch, setUniverseSearch] = useState("");

  const period = PERIODS[periodIdx];

  const toggleType = (t: AssetType) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(t)) newSet.delete(t);
    else newSet.add(t);
    setSelectedTypes(newSet);
  };

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

  const classReturns = useMemo(() => {
    return ASSET_TYPES.map((t) => {
      const ofType = filtered.filter((a) => a.assetType === t);
      if (ofType.length === 0) return { type: t, label: ASSET_CLASS_LABELS[t], ret: 0, count: 0 };
      const rets = ofType.map((a) => calcMetrics(a.sliced).ret);
      const avg = rets.reduce((s, r) => s + r, 0) / rets.length;
      return { type: t, label: ASSET_CLASS_LABELS[t], ret: avg, count: ofType.length };
    }).filter((c) => c.count > 0);
  }, [filtered]);

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
        color: ASSET_CLASS_COLORS[a.assetType],
        cumulativeReturns: data.map((d) => d.close / base - 1),
      };
    });

    return { dates, series };
  }, [assets, selectedTypes, period]);

  const totalAssets = filtered.length;
  const positiveCount = filtered.filter((a) => calcMetrics(a.sliced).ret > 0).length;

  // Universe (S&P 500) — 검색 + 정렬
  const universeFiltered = useMemo(() => {
    let list = universe;
    if (universeSearch) {
      const q = universeSearch.toUpperCase();
      list = list.filter((u) => u.ticker.includes(q));
    }
    return list.sort((a, b) => b.metrics.return1Y - a.metrics.return1Y);
  }, [universe, universeSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{T.multiAssetDashboard}</h1>
          <p className="text-xs text-gray-500">
            상세 분석 자산 {assets.length}개 · S&P 500 + ETF 유니버스 {universe.length}개 · 총 {assets.length + universe.length}개
          </p>
        </div>
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
          <span className="text-xs text-gray-400">{T.assetClasses}:</span>
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
          <p className="text-xs text-gray-400">{T.trackedAssets}</p>
          <p className="mt-1 text-2xl font-bold">{totalAssets}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">{T.assetClasses}</p>
          <p className="mt-1 text-2xl font-bold">{selectedTypes.size}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">{T.positiveAssets} ({period.label})</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{positiveCount}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-400">{T.negativeAssets} ({period.label})</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{totalAssets - positiveCount}</p>
        </div>
      </div>

      {/* 자산 클래스별 평균 수익률 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">{T.classPerformance} ({period.label})</h2>
        <div className="space-y-2">
          {classReturns.sort((a, b) => b.ret - a.ret).map((c) => (
            <div key={c.type} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: ASSET_CLASS_COLORS[c.type] }} />
              <span className="w-32 text-sm text-gray-300">{c.label}</span>
              <span className="w-12 text-xs text-gray-500">({c.count}개)</span>
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
        <h2 className="mb-3 font-semibold">{T.crossAssetPerf} — {T.representativeTickers}</h2>
        {chartData.dates.length > 0 && (
          <CumulativeReturnChart dates={chartData.dates} series={chartData.series} />
        )}
      </section>

      {/* 크로스 에셋 상관 매트릭스 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">{T.crossAssetCorr}</h2>
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
          파랑: 양의 상관 / 빨강: 음의 상관 / 색 진하기: 절댓값
        </p>
      </section>

      {/* 전체 자산 테이블 (정렬 가능) */}
      <SortableAllAssetsTable filtered={filtered} periodLabel={period.label} />

      {/* S&P 500 유니버스 — 검색 가능한 대형 테이블 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">
            S&P 500 유니버스 ({universe.length}개)
            <span className="ml-2 text-xs text-gray-500">사전 계산 지표 · 1년 기준</span>
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={universeSearch}
              onChange={(e) => setUniverseSearch(e.target.value)}
              placeholder="종목 검색 (예: AAPL)"
              className="rounded bg-gray-800 px-3 py-1 text-sm text-white placeholder-gray-500"
            />
            <button
              onClick={() => setShowUniverse(!showUniverse)}
              className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:text-white"
            >
              {showUniverse ? "접기" : "펼치기"}
            </button>
          </div>
        </div>
        {showUniverse && (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-900 border-b border-gray-700 text-xs text-gray-400">
                <tr>
                  <th className="pb-2">{T.ticker}</th>
                  <th className="pb-2 text-right">현재가</th>
                  <th className="pb-2 text-right">1년 {T.return}</th>
                  <th className="pb-2 text-right">{T.volatility}</th>
                  <th className="pb-2 text-right">{T.sharpe}</th>
                  <th className="pb-2 text-right">{T.mdd}</th>
                </tr>
              </thead>
              <tbody>
                {universeFiltered.slice(0, 200).map((u) => (
                  <tr key={u.ticker} className="border-b border-gray-800">
                    <td className="py-2 font-mono font-bold">{u.ticker}</td>
                    <td className="py-2 text-right font-mono text-gray-300">${u.metrics.currentPrice.toFixed(2)}</td>
                    <td className={`py-2 text-right font-mono ${u.metrics.return1Y >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {(u.metrics.return1Y * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-right font-mono text-gray-300">{(u.metrics.volatility * 100).toFixed(1)}%</td>
                    <td className={`py-2 text-right font-mono ${u.metrics.sharpe > 1 ? "text-green-400" : u.metrics.sharpe < 0 ? "text-red-400" : "text-gray-300"}`}>
                      {u.metrics.sharpe.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-mono text-red-400">{(u.metrics.mdd * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {universeFiltered.length > 200 && (
              <p className="mt-2 text-center text-xs text-gray-500">상위 200개 표시 중 (전체 {universeFiltered.length}개)</p>
            )}
          </div>
        )}
        {!showUniverse && (
          <p className="text-sm text-gray-500">펼치기를 눌러 S&P 500 전체 종목을 확인하세요</p>
        )}
      </section>
    </div>
  );
}
