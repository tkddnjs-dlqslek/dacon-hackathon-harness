"use client";

import { useState, useMemo } from "react";
import { CumulativeReturnChart } from "@/components/charts";
import type { AssetType, OHLCV } from "@/types";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/types";

interface AssetLite {
  ticker: string;
  name: string;
  assetType: AssetType;
  data: OHLCV[];
}

interface Props {
  assets: AssetLite[];
}

const PERIODS = [
  { label: "1개월", days: 21 },
  { label: "3개월", days: 63 },
  { label: "6개월", days: 126 },
  { label: "1년", days: 252 },
  { label: "2년", days: 501 },
];

const PRESETS: { label: string; tickers: string[] }[] = [
  { label: "주식 vs 채권 vs 금", tickers: ["SPY", "^TNX", "GLD"] },
  { label: "비트코인 vs 금 vs S&P 500", tickers: ["BTC-USD", "GLD", "SPY"] },
  { label: "글로벌 지수", tickers: ["^GSPC", "^N225", "^KS11", "^FTSE"] },
  { label: "암호화폐 톱5", tickers: ["BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD", "SOL-USD"] },
  { label: "원자재 비교", tickers: ["GLD", "SLV", "USO", "UNG"] },
  { label: "주요 통화", tickers: ["USDKRW=X", "EURUSD=X", "USDJPY=X"] },
  { label: "한국 시총 톱5", tickers: ["005930.KS", "000660.KS", "035420.KS", "005380.KS", "207940.KS"] },
];

function calcMetrics(data: OHLCV[]) {
  if (data.length < 2) return { ret: 0, vol: 0, mdd: 0, sharpe: 0 };
  const ret = data[data.length - 1].close / data[0].close - 1;
  const dr: number[] = [];
  for (let i = 1; i < data.length; i++) dr.push(data[i].close / data[i - 1].close - 1);
  const mean = dr.reduce((a, b) => a + b, 0) / dr.length;
  const vol = Math.sqrt(dr.reduce((s, r) => s + (r - mean) ** 2, 0) / (dr.length - 1)) * Math.sqrt(252);
  const annRet = Math.pow(1 + ret, 252 / data.length) - 1;
  const sharpe = vol === 0 ? 0 : (annRet - 0.04) / vol;
  let peak = data[0].close, mdd = 0;
  for (const d of data) { if (d.close > peak) peak = d.close; const dd = (d.close - peak) / peak; if (dd < mdd) mdd = dd; }
  return { ret, vol, mdd, sharpe };
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

export default function MultiCompareClient({ assets }: Props) {
  const [selected, setSelected] = useState<string[]>(["SPY", "^TNX", "GLD", "BTC-USD"]);
  const [periodIdx, setPeriodIdx] = useState(3);
  const [search, setSearch] = useState("");

  const period = PERIODS[periodIdx];

  const toggle = (ticker: string) => {
    if (selected.includes(ticker)) {
      setSelected(selected.filter((t) => t !== ticker));
    } else if (selected.length < 8) {
      setSelected([...selected, ticker]);
    }
  };

  const applyPreset = (tickers: string[]) => {
    setSelected(tickers.filter((t) => assets.some((a) => a.ticker === t)));
  };

  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toUpperCase();
    return assets
      .filter((a) => !selected.includes(a.ticker))
      .filter((a) => a.ticker.toUpperCase().includes(q) || a.name.toUpperCase().includes(q))
      .slice(0, 20);
  }, [assets, search, selected]);

  const selectedAssets = useMemo(
    () => selected.map((t) => assets.find((a) => a.ticker === t)).filter(Boolean) as AssetLite[],
    [assets, selected]
  );

  const sliced = useMemo(() => selectedAssets.map((a) => ({
    ...a,
    sliced: a.data.slice(-period.days),
  })), [selectedAssets, period]);

  const minLen = sliced.length > 0 ? Math.min(...sliced.map((s) => s.sliced.length)) : 0;

  const chartData = useMemo(() => {
    if (sliced.length === 0 || minLen === 0) return { dates: [], series: [] };
    const dates = sliced[0].sliced.slice(-minLen).map((d) => d.date);
    const series = sliced.map((a) => {
      const data = a.sliced.slice(-minLen);
      const base = data[0]?.close ?? 1;
      return {
        ticker: a.ticker,
        sector: ASSET_CLASS_LABELS[a.assetType],
        color: ASSET_CLASS_COLORS[a.assetType],
        cumulativeReturns: data.map((d) => d.close / base - 1),
      };
    });
    return { dates, series };
  }, [sliced, minLen]);

  const metricsTable = sliced.map((a) => ({
    ticker: a.ticker,
    name: a.name,
    assetType: a.assetType,
    ...calcMetrics(a.sliced),
  }));

  // 상관관계 행렬
  const corrMatrix = useMemo(() => {
    const returns = sliced.map((a) => dailyReturns(a.sliced));
    return sliced.map((_, i) => sliced.map((_, j) => corr(returns[i], returns[j])));
  }, [sliced]);

  return (
    <div className="space-y-6">
      {/* 프리셋 + 기간 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">프리셋 비교</h2>
          <div className="flex gap-1">
            {PERIODS.map((p, i) => (
              <button key={p.label} onClick={() => setPeriodIdx(i)}
                className={`rounded px-3 py-1 text-sm ${i === periodIdx ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => applyPreset(p.tickers)}
              className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:border-blue-500 hover:text-white">
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* 자산 추가 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">자산 추가 (최대 8개, 현재 {selected.length}개)</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="검색: 티커 또는 이름 (예: AAPL, 삼성, BTC)"
          className="w-full rounded bg-gray-800 px-4 py-2 text-white placeholder-gray-500"
        />
        {searchResults.length > 0 && (
          <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
            {searchResults.map((r) => (
              <button key={r.ticker} onClick={() => { toggle(r.ticker); setSearch(""); }}
                className="flex w-full items-center gap-3 rounded p-2 text-left text-sm hover:bg-gray-800">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[r.assetType] }} />
                <span className="font-mono font-bold text-blue-400">{r.ticker}</span>
                <span className="text-gray-300">{r.name}</span>
                <span className="ml-auto text-xs text-gray-500">{ASSET_CLASS_LABELS[r.assetType]}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 선택 자산 칩 */}
      {selectedAssets.length > 0 && (
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">선택한 자산</h2>
          <div className="flex flex-wrap gap-2">
            {selectedAssets.map((a) => (
              <button key={a.ticker} onClick={() => toggle(a.ticker)}
                className="flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs text-white hover:opacity-80"
                style={{ borderColor: ASSET_CLASS_COLORS[a.assetType], backgroundColor: `${ASSET_CLASS_COLORS[a.assetType]}30` }}>
                <span className="font-mono font-bold">{a.ticker}</span>
                <span className="text-gray-300">{a.name}</span>
                <span className="text-gray-500">×</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 누적 수익률 차트 */}
      {chartData.dates.length > 0 && (
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">누적 수익률 비교 ({period.label})</h2>
          <CumulativeReturnChart dates={chartData.dates} series={chartData.series} />
        </section>
      )}

      {/* 지표 비교 표 */}
      {metricsTable.length > 0 && (
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">지표 비교 ({period.label})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700 text-xs text-gray-400">
                <tr>
                  <th className="pb-2">분류</th>
                  <th className="pb-2">종목</th>
                  <th className="pb-2">이름</th>
                  <th className="pb-2 text-right">수익률</th>
                  <th className="pb-2 text-right">변동성</th>
                  <th className="pb-2 text-right">샤프</th>
                  <th className="pb-2 text-right">최대 낙폭</th>
                </tr>
              </thead>
              <tbody>
                {metricsTable
                  .sort((a, b) => b.ret - a.ret)
                  .map((m) => (
                    <tr key={m.ticker} className="border-b border-gray-800">
                      <td className="py-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[m.assetType] }} />
                        {" "}<span className="text-xs text-gray-500">{ASSET_CLASS_LABELS[m.assetType]}</span>
                      </td>
                      <td className="py-2 font-mono font-bold">{m.ticker}</td>
                      <td className="py-2 text-gray-400">{m.name}</td>
                      <td className={`py-2 text-right font-mono ${m.ret >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {(m.ret * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-mono text-gray-300">{(m.vol * 100).toFixed(1)}%</td>
                      <td className={`py-2 text-right font-mono ${m.sharpe > 1 ? "text-green-400" : m.sharpe < 0 ? "text-red-400" : "text-gray-300"}`}>
                        {m.sharpe.toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-mono text-red-400">{(m.mdd * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 상관관계 매트릭스 */}
      {corrMatrix.length >= 2 && (
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">상관관계 매트릭스</h2>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th />
                  {sliced.map((a) => (
                    <th key={a.ticker} className="px-2 py-1 text-center text-gray-400">{a.ticker}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sliced.map((a, i) => (
                  <tr key={a.ticker}>
                    <td className="pr-2 text-right text-gray-400">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[a.assetType] }} />
                      {" "}{a.ticker}
                    </td>
                    {corrMatrix[i].map((val, j) => {
                      const abs = Math.abs(val);
                      const r = val > 0 ? Math.round(abs * 220) : 50;
                      const b = val < 0 ? Math.round(abs * 220) : 50;
                      return (
                        <td key={j} className="px-2 py-1 text-center font-mono"
                          style={{ backgroundColor: `rgba(${r},50,${b},${0.3 + abs * 0.5})`, color: abs > 0.5 ? "#fff" : "#aaa" }}>
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
      )}
    </div>
  );
}
