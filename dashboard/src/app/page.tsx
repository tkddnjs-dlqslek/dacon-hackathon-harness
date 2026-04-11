// 메인 대시보드 (/) — report-layout.md §1.1
// 서버 컴포넌트: 데이터 로드 + 분석 엔진 실행 → 클라이언트에 결과 전달

import { loadETFPrices, loadETFMetadata, loadRiskFreeRate } from "@/lib/load-server-data";
import {
  computeMetricsWithBenchmark,
  dailyReturns,
  correlationMatrix,
  filterByPeriod,
  cumulativeReturns,
} from "@/lib/analysis-engine";
import { topInsights, generateETFInsights, generateSectorInsights } from "@/lib/insight-generator";
import type { ETFMetrics, PeriodLabel } from "@/types";
import { SECTOR_COLORS } from "@/types";

export default async function DashboardPage() {
  const [etfPrices, metadata, riskFreeRate] = await Promise.all([
    loadETFPrices(),
    loadETFMetadata(),
    loadRiskFreeRate(),
  ]);

  // SPY 벤치마크 분리
  const spy = etfPrices.find((e) => e.ticker === "SPY");
  const sectorETFs = etfPrices.filter((e) => e.ticker !== "SPY");

  // 전 ETF 지표 계산
  const allMetrics: ETFMetrics[] = sectorETFs.map((etf) =>
    computeMetricsWithBenchmark(etf.ticker, etf.data, spy?.data ?? etf.data, riskFreeRate)
  );

  // 포트폴리오 균등 배분 기준 요약 KPI
  const avgReturn = allMetrics.reduce((s, m) => s + m.returnPeriod["1Y"], 0) / allMetrics.length;
  const avgVol = allMetrics.reduce((s, m) => s + m.volatility, 0) / allMetrics.length;
  const avgSharpe = allMetrics.reduce((s, m) => s + m.sharpe, 0) / allMetrics.length;
  const worstMDD = Math.min(...allMetrics.map((m) => m.mdd));

  // 상관관계 행렬
  const allReturns = sectorETFs.map((etf) => dailyReturns(etf.data));
  const corrMatrix = correlationMatrix(allReturns);

  // 인사이트 생성
  const etfInsights = allMetrics.flatMap((m) => generateETFInsights(m));
  const sectorInsights = generateSectorInsights(
    sectorETFs.map((etf, i) => ({
      sector: etf.sector,
      return3m: allMetrics[i].returnPeriod["3M"],
    }))
  );
  const insights = topInsights([...etfInsights, ...sectorInsights], 5);

  // 섹터별 수익률 (1Y, 내림차순)
  const sectorReturns = sectorETFs
    .map((etf, i) => ({
      sector: etf.sector,
      ticker: etf.ticker,
      return1Y: allMetrics[i].returnPeriod["1Y"],
    }))
    .sort((a, b) => b.return1Y - a.return1Y);

  const insightColors: Record<string, string> = {
    danger: "border-red-800 bg-red-950 text-red-300",
    warning: "border-yellow-800 bg-yellow-950 text-yellow-300",
    success: "border-green-800 bg-green-950 text-green-300",
    info: "border-blue-800 bg-blue-950 text-blue-300",
  };

  const insightLabels: Record<string, string> = {
    danger: "ALERT",
    warning: "WARN",
    success: "GOOD",
    info: "INFO",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* A. 인사이트 요약 배너 */}
      <section className="flex gap-3 overflow-x-auto pb-2">
        {insights.map((ins, i) => (
          <div key={i} className={`min-w-[260px] rounded-lg border p-4 ${insightColors[ins.level]}`}>
            <span className="text-xs font-bold opacity-70">{insightLabels[ins.level]}</span>
            <p className="mt-1 text-sm">{ins.message}</p>
          </div>
        ))}
      </section>

      {/* B. 시장 요약 KPI + C. 섹터 비중 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="grid grid-cols-2 gap-3">
          {[
            { label: "Avg Return (1Y)", value: `${(avgReturn * 100).toFixed(1)}%`, positive: avgReturn >= 0 },
            { label: "Avg Volatility", value: `${(avgVol * 100).toFixed(1)}%`, positive: false },
            { label: "Avg Sharpe", value: avgSharpe.toFixed(2), positive: avgSharpe > 1 },
            { label: "Worst MDD", value: `${(worstMDD * 100).toFixed(1)}%`, positive: false },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-400">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold ${kpi.positive ? "text-green-400" : kpi.value.startsWith("-") ? "text-red-400" : "text-white"}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-400">Sector Allocation</h2>
          <div className="space-y-2">
            {metadata.map((m) => (
              <div key={m.ticker} className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: SECTOR_COLORS[m.sector] ?? "#94A3B8" }} />
                <span className="w-32 text-gray-300">{m.sector}</span>
                <span className="text-gray-500">{m.ticker}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* E. 섹터별 수익률 랭킹 + F. ETF 성과 테이블 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">Sector Return Ranking (1Y)</h2>
          <div className="space-y-2">
            {sectorReturns.map((s) => (
              <div key={s.ticker} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: SECTOR_COLORS[s.sector] ?? "#94A3B8" }} />
                <span className="w-36 text-sm text-gray-300">{s.sector}</span>
                <div className="flex-1">
                  <div
                    className={`h-5 rounded ${s.return1Y >= 0 ? "bg-green-600" : "bg-red-600"}`}
                    style={{ width: `${Math.min(Math.abs(s.return1Y * 100) * 2, 100)}%` }}
                  />
                </div>
                <span className={`w-16 text-right text-sm font-mono ${s.return1Y >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {(s.return1Y * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">ETF Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700 text-xs text-gray-400">
                <tr>
                  <th className="pb-2">Ticker</th>
                  <th className="pb-2 text-right">1Y</th>
                  <th className="pb-2 text-right">Vol</th>
                  <th className="pb-2 text-right">Sharpe</th>
                  <th className="pb-2 text-right">MDD</th>
                  <th className="pb-2 text-right">Beta</th>
                </tr>
              </thead>
              <tbody>
                {allMetrics
                  .sort((a, b) => b.returnPeriod["1Y"] - a.returnPeriod["1Y"])
                  .map((m) => (
                    <tr key={m.ticker} className="border-b border-gray-800">
                      <td className="py-2 font-mono font-bold">{m.ticker}</td>
                      <td className={`py-2 text-right font-mono ${m.returnPeriod["1Y"] >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {(m.returnPeriod["1Y"] * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-mono text-gray-300">{(m.volatility * 100).toFixed(1)}%</td>
                      <td className={`py-2 text-right font-mono ${m.sharpe > 1 ? "text-green-400" : m.sharpe < 0 ? "text-red-400" : "text-gray-300"}`}>
                        {m.sharpe.toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-mono text-red-400">{(m.mdd * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right font-mono text-gray-300">{m.beta.toFixed(2)}</td>
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
            <thead>
              <tr>
                <th />
                {sectorETFs.map((e) => (
                  <th key={e.ticker} className="px-1 py-1 text-center text-gray-400">{e.ticker}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectorETFs.map((e, i) => (
                <tr key={e.ticker}>
                  <td className="pr-2 text-right text-gray-400">{e.ticker}</td>
                  {corrMatrix[i].map((val, j) => {
                    const abs = Math.abs(val);
                    const r = val > 0 ? Math.round(abs * 220) : 50;
                    const g = 50;
                    const b = val < 0 ? Math.round(abs * 220) : 50;
                    return (
                      <td
                        key={j}
                        className="px-1 py-1 text-center font-mono"
                        style={{ backgroundColor: `rgba(${r},${g},${b},${0.3 + abs * 0.5})`, color: abs > 0.5 ? "#fff" : "#aaa" }}
                      >
                        {val.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* D & H placeholder — 차트 컴포넌트 구현 시 교체 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">Cumulative Returns & Rebalance Simulator</h2>
        <p className="text-sm text-gray-500">Chart components will be wired in the next phase.</p>
      </section>
    </div>
  );
}
