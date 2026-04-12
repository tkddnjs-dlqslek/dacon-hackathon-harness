"use client";

// 효율적 프론티어 — 몬테카를로 시뮬레이션
// 1000개 랜덤 비중 포트폴리오 생성 → 산점도 (변동성 vs 수익률, 색=샤프)

import { useMemo, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import type { OHLCV } from "@/types";

interface ETFInput {
  ticker: string;
  sector: string;
  data: OHLCV[];
}

interface Props {
  etfs: ETFInput[];
  riskFreeRate: number;
}

interface Portfolio {
  vol: number;
  ret: number;
  sharpe: number;
  weights: number[];
}

const N_SIMS = 1000;

function dailyReturns(data: OHLCV[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < data.length; i++) r.push(data[i].close / data[i - 1].close - 1);
  return r;
}

function sharpeColor(sharpe: number): string {
  if (sharpe > 1.5) return "#10B981";
  if (sharpe > 1.0) return "#3B82F6";
  if (sharpe > 0.5) return "#8B5CF6";
  if (sharpe > 0) return "#F59E0B";
  return "#EF4444";
}

export default function EfficientFrontier({ etfs, riskFreeRate }: Props) {
  const [period, setPeriod] = useState<number>(252);

  const simulation = useMemo(() => {
    const n = etfs.length;
    if (n < 2) return null;

    // 일간 수익률 매트릭스
    const returns = etfs.map((e) => dailyReturns(e.data.slice(-period)));
    const minLen = Math.min(...returns.map((r) => r.length));
    const aligned = returns.map((r) => r.slice(-minLen));

    // 평균 수익률 (연환산)
    const means = aligned.map((r) => (r.reduce((a, b) => a + b, 0) / r.length) * 252);

    // 공분산 행렬 (연환산)
    const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let c = 0;
        for (let k = 0; k < minLen; k++) {
          c += (aligned[i][k] - means[i] / 252) * (aligned[j][k] - means[j] / 252);
        }
        cov[i][j] = (c / (minLen - 1)) * 252;
        cov[j][i] = cov[i][j];
      }
    }

    // 몬테카를로 시뮬레이션
    const portfolios: Portfolio[] = [];
    for (let s = 0; s < N_SIMS; s++) {
      // Dirichlet 비슷한 분포 (랜덤 + 정규화)
      const w = Array.from({ length: n }, () => Math.random());
      const sum = w.reduce((a, b) => a + b, 0);
      const weights = w.map((x) => x / sum);

      // 포트폴리오 수익률 = Σ(w_i × μ_i)
      const ret = weights.reduce((acc, w_i, i) => acc + w_i * means[i], 0);

      // 포트폴리오 변동성 = √(W^T × Σ × W)
      let variance = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          variance += weights[i] * weights[j] * cov[i][j];
        }
      }
      const vol = Math.sqrt(variance);
      const sharpe = vol === 0 ? 0 : (ret - riskFreeRate) / vol;

      portfolios.push({ vol, ret, sharpe, weights });
    }

    // 균등 배분 포트폴리오
    const equalW = Array(n).fill(1 / n);
    const equalRet = means.reduce((a, b) => a + b, 0) / n;
    let equalVar = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        equalVar += equalW[i] * equalW[j] * cov[i][j];
      }
    }
    const equalVol = Math.sqrt(equalVar);
    const equalPort: Portfolio = {
      vol: equalVol,
      ret: equalRet,
      sharpe: equalVol === 0 ? 0 : (equalRet - riskFreeRate) / equalVol,
      weights: equalW,
    };

    // 최적 포트폴리오 찾기
    const maxSharpe = portfolios.reduce((best, p) => p.sharpe > best.sharpe ? p : best, portfolios[0]);
    const minVol = portfolios.reduce((best, p) => p.vol < best.vol ? p : best, portfolios[0]);
    const maxRet = portfolios.reduce((best, p) => p.ret > best.ret ? p : best, portfolios[0]);

    return { portfolios, maxSharpe, minVol, maxRet, equalPort };
  }, [etfs, riskFreeRate, period]);

  if (!simulation) return null;

  const scatterData = simulation.portfolios.map((p) => ({
    vol: +(p.vol * 100).toFixed(2),
    ret: +(p.ret * 100).toFixed(2),
    sharpe: +p.sharpe.toFixed(3),
  }));

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">효율적 프론티어 ({N_SIMS}개 랜덤 포트폴리오)</h2>
        <div className="flex gap-1">
          {[
            { label: "1년", days: 252 },
            { label: "2년", days: 501 },
          ].map((p) => (
            <button key={p.label} onClick={() => setPeriod(p.days)}
              className={`rounded px-2 py-1 text-xs ${period === p.days ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            type="number"
            dataKey="vol"
            name="변동성"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "변동성 (%)", position: "insideBottom", offset: -10, fill: "#9ca3af", fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="ret"
            name="수익률"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "수익률 (%)", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
          />
          <ZAxis range={[15, 15]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
            formatter={(value, name) => {
              const v = Number(value);
              if (name === "샤프") return [v.toFixed(2), name];
              return [`${v.toFixed(2)}%`, name];
            }}
          />
          <Scatter data={scatterData} fill="#3B82F6">
            {scatterData.map((entry, i) => (
              <Cell key={i} fill={sharpeColor(entry.sharpe)} fillOpacity={0.5} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* 최적 포트폴리오 비교 */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-green-800/50 bg-gray-950 p-3">
          <p className="text-xs text-green-400">🏆 최대 샤프 비율</p>
          <p className="mt-1 font-mono text-lg">{simulation.maxSharpe.sharpe.toFixed(2)}</p>
          <p className="text-xs text-gray-500">
            수익률 {(simulation.maxSharpe.ret * 100).toFixed(1)}% / 변동성 {(simulation.maxSharpe.vol * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-cyan-800/50 bg-gray-950 p-3">
          <p className="text-xs text-cyan-400">🛡 최소 변동성</p>
          <p className="mt-1 font-mono text-lg">{(simulation.minVol.vol * 100).toFixed(1)}%</p>
          <p className="text-xs text-gray-500">
            수익률 {(simulation.minVol.ret * 100).toFixed(1)}% / 샤프 {simulation.minVol.sharpe.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-orange-800/50 bg-gray-950 p-3">
          <p className="text-xs text-orange-400">📈 최대 수익률</p>
          <p className="mt-1 font-mono text-lg">{(simulation.maxRet.ret * 100).toFixed(1)}%</p>
          <p className="text-xs text-gray-500">
            변동성 {(simulation.maxRet.vol * 100).toFixed(1)}% / 샤프 {simulation.maxRet.sharpe.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 최대 샤프 포트폴리오 비중 */}
      <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950 p-3">
        <p className="mb-2 text-xs text-gray-400">최대 샤프 포트폴리오 비중</p>
        <div className="flex flex-wrap gap-2">
          {etfs.map((etf, i) => {
            const w = simulation.maxSharpe.weights[i];
            if (w < 0.01) return null;
            return (
              <span key={etf.ticker} className="rounded-full bg-gray-800 px-3 py-1 text-xs">
                <span className="font-mono font-bold">{etf.ticker}</span>
                <span className="ml-1 text-gray-400">{(w * 100).toFixed(0)}%</span>
              </span>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        몬테카를로 시뮬레이션 기반 — Sharpe 색상: 빨강(0 미만) → 주황(0.5) → 보라(1) → 파랑(1.5) → 초록(1.5+)
      </p>
    </section>
  );
}
