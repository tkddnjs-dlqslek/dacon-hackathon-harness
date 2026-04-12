// 종목 검색 + 관심종목 + 즉석 분석 페이지

"use client";

import { useState, useEffect, useCallback } from "react";
import { CumulativeReturnChart } from "@/components/charts";
import { getWatchlist, addToWatchlist, removeFromWatchlist, type WatchlistItem } from "@/lib/watchlist";
import type { Asset, OHLCV } from "@/types";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/types";

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

interface AssetWithMetrics extends Asset {
  metrics?: {
    return: number;
    volatility: number;
    mdd: number;
    sharpe: number;
  };
}

function calcMetrics(data: OHLCV[]) {
  if (data.length < 2) return { return: 0, volatility: 0, mdd: 0, sharpe: 0 };
  const ret = data[data.length - 1].close / data[0].close - 1;
  const dr: number[] = [];
  for (let i = 1; i < data.length; i++) dr.push(data[i].close / data[i - 1].close - 1);
  const mean = dr.reduce((a, b) => a + b, 0) / dr.length;
  const vol = Math.sqrt(dr.reduce((s, r) => s + (r - mean) ** 2, 0) / (dr.length - 1)) * Math.sqrt(252);
  const annRet = Math.pow(1 + ret, 252 / data.length) - 1;
  const sharpe = vol === 0 ? 0 : (annRet - 0.04) / vol;
  let peak = data[0].close, mdd = 0;
  for (const d of data) { if (d.close > peak) peak = d.close; const dd = (d.close - peak) / peak; if (dd < mdd) mdd = dd; }
  return { return: ret, volatility: vol, mdd, sharpe };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [assets, setAssets] = useState<AssetWithMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // 페이지 로드 시 watchlist 복원
  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  // watchlist 변경 시 자산 데이터 fetch
  const fetchWatchlistData = useCallback(async (list: WatchlistItem[]) => {
    if (list.length === 0) {
      setAssets([]);
      return;
    }
    setLoading(true);
    try {
      const fetched = await Promise.all(
        list.map(async (item) => {
          try {
            const res = await fetch(`/api/ticker?symbol=${encodeURIComponent(item.symbol)}&period=2y`);
            if (!res.ok) return null;
            const asset: Asset = await res.json();
            return { ...asset, metrics: calcMetrics(asset.data) };
          } catch {
            return null;
          }
        })
      );
      setAssets(fetched.filter(Boolean) as AssetWithMetrics[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlistData(watchlist);
  }, [watchlist, fetchWatchlistData]);

  // 검색 (디바운스)
  useEffect(() => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = (item: SearchResult) => {
    const updated = addToWatchlist(item.symbol, item.name);
    setWatchlist(updated);
    setQuery("");
    setSearchResults([]);
  };

  const handleRemove = (symbol: string) => {
    const updated = removeFromWatchlist(symbol);
    setWatchlist(updated);
  };

  // 차트 데이터 (관심종목 모두)
  const chartData = (() => {
    if (assets.length === 0) return { dates: [], series: [] };
    const minLen = Math.min(...assets.map((a) => a.data.length));
    const dates = assets[0].data.slice(-minLen).map((d) => d.date);
    const series = assets.map((a) => {
      const sliced = a.data.slice(-minLen);
      const base = sliced[0]?.close ?? 1;
      return {
        ticker: a.ticker,
        sector: ASSET_CLASS_LABELS[a.assetType],
        cumulativeReturns: sliced.map((d) => d.close / base - 1),
      };
    });
    return { dates, series };
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">종목 검색 & 관심종목</h1>
        <p className="mt-1 text-sm text-gray-500">
          전 세계 어떤 종목이든 검색해서 관심종목에 추가하면 즉시 분석합니다.
          (yahoo-finance2 실시간 어댑터, API 키 불필요)
        </p>
      </div>

      {/* 검색 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">종목 검색</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: AAPL, 삼성전자, BTC-USD, EURUSD=X"
          className="w-full rounded bg-gray-800 px-4 py-2 text-white placeholder-gray-500"
          autoFocus
        />
        {searching && <p className="mt-2 text-xs text-gray-500">검색 중...</p>}
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-1">
            {searchResults.map((r) => (
              <button
                key={r.symbol}
                onClick={() => handleAdd(r)}
                className="flex w-full items-center justify-between rounded p-2 text-left text-sm hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-400">{r.symbol}</span>
                  <span className="text-gray-300">{r.name}</span>
                  {r.exchange && <span className="text-xs text-gray-500">{r.exchange}</span>}
                </div>
                <span className="text-xs text-gray-500">+ 추가</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 관심종목 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">관심종목 ({watchlist.length}개)</h2>
          {loading && <span className="text-xs text-gray-500">데이터 불러오는 중...</span>}
        </div>
        {watchlist.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            관심종목이 비어있습니다. 위에서 종목을 검색하여 추가하세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700 text-xs text-gray-400">
                <tr>
                  <th className="pb-2">종목</th>
                  <th className="pb-2">이름</th>
                  <th className="pb-2">분류</th>
                  <th className="pb-2 text-right">2년 수익률</th>
                  <th className="pb-2 text-right">변동성</th>
                  <th className="pb-2 text-right">샤프</th>
                  <th className="pb-2 text-right">최대 낙폭</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.ticker} className="border-b border-gray-800">
                    <td className="py-2 font-mono font-bold">{a.ticker}</td>
                    <td className="py-2 text-gray-400">{a.name}</td>
                    <td className="py-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[a.assetType] }} />
                      {" "}<span className="text-xs text-gray-500">{ASSET_CLASS_LABELS[a.assetType]}</span>
                    </td>
                    <td className={`py-2 text-right font-mono ${(a.metrics?.return ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {((a.metrics?.return ?? 0) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-right font-mono text-gray-300">{((a.metrics?.volatility ?? 0) * 100).toFixed(1)}%</td>
                    <td className={`py-2 text-right font-mono ${(a.metrics?.sharpe ?? 0) > 1 ? "text-green-400" : "text-gray-300"}`}>
                      {(a.metrics?.sharpe ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-mono text-red-400">{((a.metrics?.mdd ?? 0) * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleRemove(a.ticker)} className="text-xs text-gray-500 hover:text-red-400">제거</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 누적 수익률 차트 */}
      {assets.length > 0 && (
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">관심종목 누적 수익률 비교</h2>
          <CumulativeReturnChart dates={chartData.dates} series={chartData.series} />
        </section>
      )}

      {/* 안내 */}
      <section className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs text-gray-500">
        <p>
          <span className="text-gray-400">데이터 소스:</span> yahoo-finance2 (실시간) — 검색하는 모든 종목이 곧바로 통일 OHLCV 스키마로 변환되어 분석됩니다. 새 자산 추가 시 코드 수정이나 사전 수집 불필요.
        </p>
      </section>
    </div>
  );
}
