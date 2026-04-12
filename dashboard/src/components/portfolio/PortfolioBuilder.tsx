"use client";

// 포트폴리오 비중 조정 + 백테스트 + 리밸런싱 — 인터랙티브 클라이언트 컴포넌트

import { useState, useMemo } from "react";
import { DualLineChart } from "@/components/charts";
import type { OHLCV } from "@/types";
import { SECTOR_COLORS } from "@/types";

interface ETFInput {
  ticker: string;
  sector: string;
  data: OHLCV[];
}

interface Props {
  etfs: ETFInput[];
  spyData: OHLCV[];
  riskFreeRate: number;
}

const RB_OPTIONS = [
  { label: "None", days: 0 },
  { label: "Monthly", days: 21 },
  { label: "Quarterly", days: 63 },
  { label: "Semi-Annual", days: 126 },
  { label: "Annual", days: 252 },
];

export default function PortfolioBuilder({ etfs, spyData, riskFreeRate }: Props) {
  const n = etfs.length;
  const [weights, setWeights] = useState<number[]>(Array(n).fill(1 / n));
  const [rbIndex, setRbIndex] = useState(2); // quarterly default

  const setWeight = (idx: number, val: number) => {
    const newW = [...weights];
    newW[idx] = val;
    // 나머지 비례 조정 (합계 1 유지)
    const othersSum = newW.reduce((s, w, i) => (i === idx ? s : s + w), 0);
    const remaining = 1 - val;
    if (othersSum > 0) {
      for (let i = 0; i < n; i++) {
        if (i !== idx) newW[i] = (newW[i] / othersSum) * remaining;
      }
    }
    setWeights(newW);
  };

  const equalWeight = () => setWeights(Array(n).fill(1 / n));

  // 백테스트 시뮬레이션
  const simulation = useMemo(() => {
    const len = Math.min(...etfs.map((e) => e.data.length), spyData.length);
    const rbDays = RB_OPTIONS[rbIndex].days;

    // 포트폴리오 가치 계산
    const init = 10000;
    let shares = weights.map((w, i) => (w * init) / etfs[i].data[0].close);
    const portfolioValues: number[] = [];
    const spyValues: number[] = [];
    const dates: string[] = [];
    let daysSinceRb = 0;

    // 리밸런싱 시뮬
    let rbShares = [...shares];
    const rebalancedValues: number[] = [];
    const buyHoldValues: number[] = [];

    const spyShares = init / spyData[0].close;

    for (let d = 0; d < len; d++) {
      dates.push(etfs[0].data[d].date);

      // 바이앤홀드
      const bhVal = shares.reduce((s, sh, i) => s + sh * etfs[i].data[d].close, 0);
      buyHoldValues.push(bhVal);

      // 리밸런싱
      const rbVal = rbShares.reduce((s, sh, i) => s + sh * etfs[i].data[d].close, 0);
      rebalancedValues.push(rbVal);

      // SPY
      spyValues.push(spyShares * spyData[d].close);

      daysSinceRb++;
      if (rbDays > 0 && daysSinceRb >= rbDays && d < len - 1) {
        rbShares = weights.map((w, i) => (w * rbVal) / etfs[i].data[d].close);
        daysSinceRb = 0;
      }
    }

    // 지표 계산
    const finalRb = rebalancedValues[rebalancedValues.length - 1];
    const totalReturn = finalRb / init - 1;
    const annReturn = Math.pow(1 + totalReturn, 252 / len) - 1;

    // 일간 수익률 → 변동성
    const dailyRets: number[] = [];
    for (let i = 1; i < rebalancedValues.length; i++) {
      dailyRets.push(rebalancedValues[i] / rebalancedValues[i - 1] - 1);
    }
    const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length;
    const variance = dailyRets.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyRets.length - 1);
    const vol = Math.sqrt(variance) * Math.sqrt(252);
    const sharpe = vol === 0 ? 0 : (annReturn - riskFreeRate) / vol;

    // MDD
    let peak = rebalancedValues[0];
    let mdd = 0;
    for (const v of rebalancedValues) {
      if (v > peak) peak = v;
      const dd = (v - peak) / peak;
      if (dd < mdd) mdd = dd;
    }

    return { dates, rebalancedValues, buyHoldValues, spyValues, annReturn, vol, sharpe, mdd };
  }, [weights, rbIndex, etfs, spyData, riskFreeRate]);

  return (
    <div className="space-y-6">
      {/* A. 비중 조정 슬라이더 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">ETF Allocation</h2>
          <button onClick={equalWeight} className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:text-white">
            Equal Weight
          </button>
        </div>
        <div className="space-y-2">
          {etfs.map((etf, i) => (
            <div key={etf.ticker} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: SECTOR_COLORS[etf.sector] ?? "#94A3B8" }} />
              <span className="w-12 text-sm font-mono">{etf.ticker}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(weights[i] * 100)}
                onChange={(e) => setWeight(i, Number(e.target.value) / 100)}
                className="flex-1 accent-blue-500"
              />
              <span className="w-12 text-right text-sm font-mono">{(weights[i] * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* B. 백테스트 + C. KPI */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">Portfolio vs SPY</h2>
          <DualLineChart
            dates={simulation.dates}
            seriesA={simulation.rebalancedValues}
            seriesB={simulation.spyValues}
            labelA="Portfolio"
            labelB="SPY"
          />
        </section>
        <section className="grid grid-cols-2 gap-3">
          {[
            { label: "Ann. Return", value: `${(simulation.annReturn * 100).toFixed(1)}%`, positive: simulation.annReturn >= 0 },
            { label: "Volatility", value: `${(simulation.vol * 100).toFixed(1)}%` },
            { label: "Sharpe", value: simulation.sharpe.toFixed(2), positive: simulation.sharpe > 1 },
            { label: "MDD", value: `${(simulation.mdd * 100).toFixed(1)}%` },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-400">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold ${kpi.positive ? "text-green-400" : kpi.value.startsWith("-") ? "text-red-400" : "text-white"}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </section>
      </div>

      {/* D. 리밸런싱 비교 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Rebalancing Comparison</h2>
          <div className="flex gap-1">
            {RB_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setRbIndex(i)}
                className={`rounded px-2 py-1 text-xs ${i === rbIndex ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <DualLineChart
          dates={simulation.dates}
          seriesA={simulation.rebalancedValues}
          seriesB={simulation.buyHoldValues}
          labelA="Rebalanced"
          labelB="Buy & Hold"
        />
      </section>
    </div>
  );
}
