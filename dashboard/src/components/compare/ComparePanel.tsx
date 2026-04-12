"use client";

// ETF vs 직접투자 비교 — 인터랙티브 클라이언트 컴포넌트

import { useState, useMemo } from "react";
import { DualLineChart, GroupedBarChart } from "@/components/charts";
import type { OHLCV, ETFMetadata } from "@/types";
import { SECTOR_COLORS } from "@/types";

interface Props {
  sectors: { sector: string; etfTicker: string; etfData: OHLCV[]; stocks: { ticker: string; data: OHLCV[] }[] }[];
  metadata: ETFMetadata[];
  riskFreeRate: number;
}

const STOCK_COUNTS = [3, 5, 10] as const;
const RB_OPTIONS = [
  { label: "없음", value: "none" as const },
  { label: "월간", value: "monthly" as const },
  { label: "분기", value: "quarterly" as const },
];
const PERIOD_OPTIONS = [
  { label: "1Y", days: 252 },
  { label: "2Y", days: 501 },
];

export default function ComparePanel({ sectors, metadata, riskFreeRate }: Props) {
  const [sectorIdx, setSectorIdx] = useState(0);
  const [stockCount, setStockCount] = useState<number>(5);
  const [rbIdx, setRbIdx] = useState(2); // quarterly
  const [periodIdx, setPeriodIdx] = useState(1); // 2Y

  const sector = sectors[sectorIdx];
  const periodDays = PERIOD_OPTIONS[periodIdx].days;
  const rbPeriod = RB_OPTIONS[rbIdx].value;

  const sim = useMemo(() => {
    if (!sector) return null;

    const etfSlice = sector.etfData.slice(-periodDays);
    const stocksSlice = sector.stocks
      .slice(0, stockCount)
      .map((s) => s.data.slice(-periodDays));

    if (etfSlice.length < 2 || stocksSlice.length === 0) return null;

    const len = Math.min(etfSlice.length, ...stocksSlice.map((s) => s.length));
    const n = stocksSlice.length;
    const init = 10000;
    const fee = 0.001;
    const expenseDaily = 0.0008 / 252;

    const dates: string[] = [];
    const etfValues: number[] = [];
    const directValues: number[] = [];

    let etfShares = (init * (1 - fee)) / etfSlice[0].close;
    let directShares = stocksSlice.map((s) => (init / n * (1 - fee)) / s[0].close);
    let etfTotalCost = init * fee;
    let directTotalCost = n * (init / n) * fee;

    const rbDays = rbPeriod === "monthly" ? 21 : rbPeriod === "quarterly" ? 63 : 0;
    let daysSinceRb = 0;

    for (let d = 0; d < len; d++) {
      dates.push(etfSlice[d].date);

      etfShares *= (1 - expenseDaily);
      const etfVal = etfShares * etfSlice[d].close;
      etfTotalCost += etfVal * expenseDaily;
      etfValues.push(etfVal);

      const directVal = directShares.reduce((s, sh, i) => s + sh * stocksSlice[i][d].close, 0);
      directValues.push(directVal);

      daysSinceRb++;
      if (rbDays > 0 && daysSinceRb >= rbDays && d < len - 1) {
        const rbCost = n * directVal * fee;
        directTotalCost += rbCost;
        const afterFee = directVal - rbCost;
        directShares = stocksSlice.map((s) => (afterFee / n) / s[d].close);
        daysSinceRb = 0;
      }
    }

    // 지표 계산
    const calc = (values: number[]) => {
      const ret = values[values.length - 1] / values[0] - 1;
      const annRet = Math.pow(1 + ret, 252 / len) - 1;
      const dr: number[] = [];
      for (let i = 1; i < values.length; i++) dr.push(values[i] / values[i - 1] - 1);
      const mean = dr.reduce((a, b) => a + b, 0) / dr.length;
      const vol = Math.sqrt(dr.reduce((s, r) => s + (r - mean) ** 2, 0) / (dr.length - 1)) * Math.sqrt(252);
      const sharpe = vol === 0 ? 0 : (annRet - riskFreeRate) / vol;
      let peak = values[0], mdd = 0;
      for (const v of values) { if (v > peak) peak = v; const dd = (v - peak) / peak; if (dd < mdd) mdd = dd; }
      return { ret: annRet, vol, sharpe, mdd };
    };

    const etfMetrics = calc(etfValues);
    const directMetrics = calc(directValues);

    // 종목별 기여도
    const holdings = sector.stocks.slice(0, stockCount).map((s, i) => {
      const sd = stocksSlice[i];
      const ret = sd && sd.length >= 2 ? sd[sd.length - 1].close / sd[0].close - 1 : 0;
      return { ticker: s.ticker, weight: 1 / n, returnPct: ret, contribution: ret / n };
    });

    return {
      dates, etfValues, directValues,
      etfMetrics, directMetrics,
      etfTotalCost, directTotalCost,
      holdings,
    };
  }, [sector, stockCount, rbIdx, periodIdx, riskFreeRate, periodDays, rbPeriod]);

  if (!sector) return <p className="text-gray-500">데이터 없음</p>;

  return (
    <div className="space-y-6">
      {/* A. 설정 패널 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="text-xs text-gray-400">섹터</label>
            <select
              value={sectorIdx}
              onChange={(e) => setSectorIdx(Number(e.target.value))}
              className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm text-white"
            >
              {sectors.map((s, i) => (
                <option key={s.sector} value={i}>{s.sector} ({s.etfTicker})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">상위 N개 종목</label>
            <div className="mt-1 flex gap-1">
              {STOCK_COUNTS.map((n) => (
                <button key={n} onClick={() => setStockCount(n)}
                  className={`rounded px-2 py-1 text-xs ${stockCount === n ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">리밸런싱</label>
            <div className="mt-1 flex gap-1">
              {RB_OPTIONS.map((o, i) => (
                <button key={o.label} onClick={() => setRbIdx(i)}
                  className={`rounded px-2 py-1 text-xs ${rbIdx === i ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">기간</label>
            <div className="mt-1 flex gap-1">
              {PERIOD_OPTIONS.map((o, i) => (
                <button key={o.label} onClick={() => setPeriodIdx(i)}
                  className={`rounded px-2 py-1 text-xs ${periodIdx === i ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {sim && (
        <>
          {/* B. KPI 비교 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded-lg border border-blue-900/50 bg-gray-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-blue-400">ETF ({sector.etfTicker})</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "수익률", value: `${(sim.etfMetrics.ret * 100).toFixed(1)}%` },
                  { label: "변동성", value: `${(sim.etfMetrics.vol * 100).toFixed(1)}%` },
                  { label: "샤프", value: sim.etfMetrics.sharpe.toFixed(2) },
                  { label: "최대 낙폭", value: `${(sim.etfMetrics.mdd * 100).toFixed(1)}%` },
                ].map((k) => (
                  <div key={k.label}><p className="text-xs text-gray-400">{k.label}</p><p className="text-lg font-bold">{k.value}</p></div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">총 비용: ${sim.etfTotalCost.toFixed(0)}</p>
            </section>
            <section className="rounded-lg border border-orange-900/50 bg-gray-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-orange-400">직접 투자 (상위 {stockCount}개)</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "수익률", value: `${(sim.directMetrics.ret * 100).toFixed(1)}%` },
                  { label: "변동성", value: `${(sim.directMetrics.vol * 100).toFixed(1)}%` },
                  { label: "샤프", value: sim.directMetrics.sharpe.toFixed(2) },
                  { label: "최대 낙폭", value: `${(sim.directMetrics.mdd * 100).toFixed(1)}%` },
                ].map((k) => (
                  <div key={k.label}><p className="text-xs text-gray-400">{k.label}</p><p className="text-lg font-bold">{k.value}</p></div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">총 비용: ${sim.directTotalCost.toFixed(0)}</p>
            </section>
          </div>

          {/* C. 누적 수익률 비교 */}
          <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 font-semibold">누적 가치 비교</h2>
            <DualLineChart dates={sim.dates} seriesA={sim.etfValues} seriesB={sim.directValues} labelA="ETF" labelB="직접 투자" />
          </section>

          {/* E. 지표별 비교 */}
          <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 font-semibold">지표 비교</h2>
            <GroupedBarChart
              data={[
                { label: "수익률 %", etf: +(sim.etfMetrics.ret * 100).toFixed(1), direct: +(sim.directMetrics.ret * 100).toFixed(1) },
                { label: "변동성 %", etf: +(sim.etfMetrics.vol * 100).toFixed(1), direct: +(sim.directMetrics.vol * 100).toFixed(1) },
                { label: "샤프", etf: +sim.etfMetrics.sharpe.toFixed(2), direct: +sim.directMetrics.sharpe.toFixed(2) },
                { label: "낙폭 %", etf: +(sim.etfMetrics.mdd * 100).toFixed(1), direct: +(sim.directMetrics.mdd * 100).toFixed(1) },
              ]}
            />
          </section>

          {/* F. 직접투자 포트폴리오 구성 */}
          <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-3 font-semibold">직접 투자 포트폴리오 구성</h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700 text-xs text-gray-400">
                <tr><th className="pb-2">종목</th><th className="pb-2 text-right">비중</th><th className="pb-2 text-right">수익률</th><th className="pb-2 text-right">기여도</th></tr>
              </thead>
              <tbody>
                {sim.holdings.map((h) => (
                  <tr key={h.ticker} className="border-b border-gray-800">
                    <td className="py-2 font-mono font-bold">{h.ticker}</td>
                    <td className="py-2 text-right font-mono text-gray-300">{(h.weight * 100).toFixed(1)}%</td>
                    <td className={`py-2 text-right font-mono ${h.returnPct >= 0 ? "text-green-400" : "text-red-400"}`}>{(h.returnPct * 100).toFixed(1)}%</td>
                    <td className={`py-2 text-right font-mono ${h.contribution >= 0 ? "text-green-400" : "text-red-400"}`}>{(h.contribution * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
