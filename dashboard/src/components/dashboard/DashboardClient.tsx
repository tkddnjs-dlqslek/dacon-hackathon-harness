"use client";

import { useState, useMemo } from "react";
import { CumulativeReturnChart, SectorBarChart, SectorDonutChart } from "@/components/charts";
import type { OHLCVData, ETFMetrics, Insight, PeriodLabel } from "@/types";
import { SECTOR_COLORS } from "@/types";

interface ETFData {
  ticker: string;
  sector: string;
  data: OHLCVData[];
}

interface Props {
  sectorETFs: ETFData[];
  allMetricsFull: ETFMetrics[]; // ALL 기간 기준 지표
  corrMatrix: number[][];
  insights: Insight[];
  sectorWeights: { sector: string; weight: number }[];
}

const PERIODS: { label: string; days: number; key: PeriodLabel }[] = [
  { label: "1M", days: 21, key: "1M" },
  { label: "3M", days: 63, key: "3M" },
  { label: "6M", days: 126, key: "6M" },
  { label: "1Y", days: 252, key: "1Y" },
  { label: "ALL", days: 0, key: "ALL" },
];

function calcMetrics(data: OHLCVData[]): { ret: number; vol: number; sharpe: number; mdd: number } {
  if (data.length < 2) return { ret: 0, vol: 0, sharpe: 0, mdd: 0 };
  const ret = data[data.length - 1].close / data[0].close - 1;
  const dr: number[] = [];
  for (let i = 1; i < data.length; i++) dr.push(data[i].close / data[i - 1].close - 1);
  const mean = dr.reduce((a, b) => a + b, 0) / dr.length;
  const vol = Math.sqrt(dr.reduce((s, r) => s + (r - mean) ** 2, 0) / (dr.length - 1)) * Math.sqrt(252);
  const annRet = Math.pow(1 + ret, 252 / data.length) - 1;
  const sharpe = vol === 0 ? 0 : (annRet - 0.04) / vol;
  let peak = data[0].close, mdd = 0;
  for (const d of data) { if (d.close > peak) peak = d.close; const dd = (d.close - peak) / peak; if (dd < mdd) mdd = dd; }
  return { ret: annRet, vol, sharpe, mdd };
}

const insightColors: Record<string, string> = {
  danger: "border-red-800 bg-red-950 text-red-300",
  warning: "border-yellow-800 bg-yellow-950 text-yellow-300",
  success: "border-green-800 bg-green-950 text-green-300",
  info: "border-blue-800 bg-blue-950 text-blue-300",
};
const insightLabels: Record<string, string> = { danger: "ALERT", warning: "WARN", success: "GOOD", info: "INFO" };

export default function DashboardClient({ sectorETFs, allMetricsFull, corrMatrix, insights, sectorWeights }: Props) {
  const [periodIdx, setPeriodIdx] = useState(3); // 1Y default
  const period = PERIODS[periodIdx];

  const filtered = useMemo(() => {
    const slice = (data: OHLCVData[]) => period.days === 0 ? data : data.slice(-period.days);
    return sectorETFs.map((etf) => ({ ...etf, sliced: slice(etf.data) }));
  }, [sectorETFs, period]);

  const periodMetrics = useMemo(() => filtered.map((etf) => ({
    ticker: etf.ticker,
    ...calcMetrics(etf.sliced),
  })), [filtered]);

  const avgReturn = periodMetrics.reduce((s, m) => s + m.ret, 0) / periodMetrics.length;
  const avgVol = periodMetrics.reduce((s, m) => s + m.vol, 0) / periodMetrics.length;
  const avgSharpe = periodMetrics.reduce((s, m) => s + m.sharpe, 0) / periodMetrics.length;
  const worstMDD = Math.min(...periodMetrics.map((m) => m.mdd));

  const sectorReturns = filtered
    .map((etf, i) => ({ sector: etf.sector, ticker: etf.ticker, value: periodMetrics[i].ret }))
    .sort((a, b) => b.value - a.value);

  const chartDates = filtered[0].sliced.map((d) => d.date);
  const chartSeries = filtered.map((etf) => {
    const base = etf.sliced[0]?.close ?? 1;
    return { ticker: etf.ticker, sector: etf.sector, cumulativeReturns: etf.sliced.map((d) => d.close / base - 1) };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-1">
          {PERIODS.map((p, i) => (
            <button key={p.label} onClick={() => setPeriodIdx(i)}
              className={`rounded px-3 py-1 text-sm ${i === periodIdx ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* A. 인사이트 */}
      <section className="flex gap-3 overflow-x-auto pb-2">
        {insights.map((ins, i) => (
          <div key={i} className={`min-w-[260px] rounded-lg border p-4 ${insightColors[ins.level]}`}>
            <span className="text-xs font-bold opacity-70">{insightLabels[ins.level]}</span>
            <p className="mt-1 text-sm">{ins.message}</p>
          </div>
        ))}
      </section>

      {/* B. KPI + C. Donut */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="grid grid-cols-2 gap-3">
          {[
            { label: `Avg Return (${period.label})`, value: `${(avgReturn * 100).toFixed(1)}%`, positive: avgReturn >= 0 },
            { label: "Avg Volatility", value: `${(avgVol * 100).toFixed(1)}%`, positive: false },
            { label: "Avg Sharpe", value: avgSharpe.toFixed(2), positive: avgSharpe > 1 },
            { label: "Worst MDD", value: `${(worstMDD * 100).toFixed(1)}%`, positive: false },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-400">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold ${kpi.positive ? "text-green-400" : kpi.value.startsWith("-") ? "text-red-400" : "text-white"}`}>{kpi.value}</p>
            </div>
          ))}
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-400">Sector Allocation</h2>
          <SectorDonutChart data={sectorWeights} />
        </section>
      </div>

      {/* D. 누적 수익률 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">Cumulative Returns ({period.label})</h2>
        <CumulativeReturnChart dates={chartDates} series={chartSeries} />
      </section>

      {/* E. 섹터 랭킹 + F. 테이블 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">Sector Return Ranking ({period.label})</h2>
          <SectorBarChart data={sectorReturns} label={`${period.label} Return`} />
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">ETF Performance ({period.label})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700 text-xs text-gray-400">
                <tr><th className="pb-2">Ticker</th><th className="pb-2 text-right">Return</th><th className="pb-2 text-right">Vol</th><th className="pb-2 text-right">Sharpe</th><th className="pb-2 text-right">MDD</th></tr>
              </thead>
              <tbody>
                {periodMetrics.sort((a, b) => b.ret - a.ret).map((m) => (
                  <tr key={m.ticker} className="border-b border-gray-800">
                    <td className="py-2 font-mono font-bold">{m.ticker}</td>
                    <td className={`py-2 text-right font-mono ${m.ret >= 0 ? "text-green-400" : "text-red-400"}`}>{(m.ret * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right font-mono text-gray-300">{(m.vol * 100).toFixed(1)}%</td>
                    <td className={`py-2 text-right font-mono ${m.sharpe > 1 ? "text-green-400" : m.sharpe < 0 ? "text-red-400" : "text-gray-300"}`}>{m.sharpe.toFixed(2)}</td>
                    <td className="py-2 text-right font-mono text-red-400">{(m.mdd * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* G. 상관관계 히트맵 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">Sector Correlation Matrix</h2>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead><tr><th />{sectorETFs.map((e) => <th key={e.ticker} className="px-1 py-1 text-center text-gray-400">{e.ticker}</th>)}</tr></thead>
            <tbody>
              {sectorETFs.map((e, i) => (
                <tr key={e.ticker}>
                  <td className="pr-2 text-right text-gray-400">{e.ticker}</td>
                  {corrMatrix[i].map((val, j) => {
                    const abs = Math.abs(val);
                    const r = val > 0 ? Math.round(abs * 220) : 50;
                    const b = val < 0 ? Math.round(abs * 220) : 50;
                    return <td key={j} className="px-1 py-1 text-center font-mono" style={{ backgroundColor: `rgba(${r},50,${b},${0.3 + abs * 0.5})`, color: abs > 0.5 ? "#fff" : "#aaa" }}>{val.toFixed(2)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
