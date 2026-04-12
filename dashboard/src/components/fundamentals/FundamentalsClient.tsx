"use client";

import { useState, useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import type { FundamentalAsset } from "@/types";
import { useSort } from "@/lib/use-sort";
import { SortIndicator } from "@/components/ui/SortIndicator";

interface Props {
  data: FundamentalAsset[];
}

type SortColumn = "ticker" | "name" | "sector" | "marketCap" | "trailingPE" | "priceToBook" | "returnOnEquity" | "dividendYield";

const PRESETS = [
  { label: "전체", filter: () => true },
  { label: "저PER (< 15)", filter: (a: FundamentalAsset) => a.trailingPE !== null && a.trailingPE > 0 && a.trailingPE < 15 },
  { label: "고ROE (> 20%)", filter: (a: FundamentalAsset) => a.returnOnEquity !== null && a.returnOnEquity > 0.2 },
  { label: "배당주 (수익률 > 3%)", filter: (a: FundamentalAsset) => a.dividendYield !== null && a.dividendYield > 0.03 },
  { label: "가치주 (PER<15 + PBR<2)", filter: (a: FundamentalAsset) =>
    a.trailingPE !== null && a.trailingPE > 0 && a.trailingPE < 15 &&
    a.priceToBook !== null && a.priceToBook > 0 && a.priceToBook < 2
  },
  { label: "성장주 (매출성장 > 20%)", filter: (a: FundamentalAsset) =>
    a.revenueGrowth !== null && a.revenueGrowth > 0.2
  },
  { label: "한국 종목", filter: (a: FundamentalAsset) => a.ticker.endsWith(".KS") },
];

function fmt(v: number | null, type: "%" | "$" | "x" | "ratio" = "ratio"): string {
  if (v === null || v === undefined) return "—";
  if (type === "%") return `${(v * 100).toFixed(1)}%`;
  if (type === "$") {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toFixed(0)}`;
  }
  if (type === "x") return `${v.toFixed(1)}x`;
  return v.toFixed(2);
}

export default function FundamentalsClient({ data }: Props) {
  const [presetIdx, setPresetIdx] = useState(0);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  const sectors = useMemo(() => {
    const s = new Set(data.map((d) => d.sector).filter((x) => x && x !== "Unknown"));
    return ["all", ...Array.from(s).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    let result = data.filter(PRESETS[presetIdx].filter);
    if (sectorFilter !== "all") result = result.filter((d) => d.sector === sectorFilter);
    if (search) {
      const q = search.toUpperCase();
      result = result.filter((d) => d.ticker.includes(q) || (d.name && d.name.toUpperCase().includes(q)));
    }
    return result;
  }, [data, presetIdx, sectorFilter, search]);

  const { sortedData, sort, handleSort } = useSort<FundamentalAsset, SortColumn>(filtered, "marketCap", "desc");

  // 산점도: PER vs ROE (가치 vs 수익성)
  const scatterData = useMemo(() => {
    return filtered
      .filter((d) => d.trailingPE !== null && d.trailingPE > 0 && d.trailingPE < 100 && d.returnOnEquity !== null)
      .map((d) => ({
        ticker: d.ticker,
        per: +d.trailingPE!.toFixed(1),
        roe: +(d.returnOnEquity! * 100).toFixed(1),
        marketCap: d.marketCap ?? 0,
      }));
  }, [filtered]);

  const sortHeader = (label: string, col: SortColumn, align: "left" | "right" = "right") => (
    <th
      onClick={() => handleSort(col)}
      className={`pb-2 cursor-pointer hover:text-white ${align === "right" ? "text-right" : ""}`}
    >
      {label} <SortIndicator active={sort.column === col} direction={sort.direction} />
    </th>
  );

  return (
    <div className="space-y-6">
      {/* 프리셋 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">스크리닝 프리셋</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => setPresetIdx(i)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                i === presetIdx ? "border-blue-500 bg-blue-600 text-white" : "border-gray-700 text-gray-300 hover:border-blue-500 hover:text-white"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* 필터 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-gray-400">종목 검색</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="예: AAPL, 삼성"
              className="mt-1 w-full rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">섹터 필터</label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="mt-1 w-full rounded bg-gray-800 px-3 py-2 text-sm text-white"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s === "all" ? "전체 섹터" : s}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">결과: {sortedData.length}개 종목</p>
      </section>

      {/* PER vs ROE 산점도 (가치 vs 수익성) */}
      {scatterData.length > 0 && (
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">PER vs ROE (가치 vs 수익성)</h2>
          <p className="mb-2 text-xs text-gray-500">
            좌상단: 저평가 + 고수익성 (이상적) · 우하단: 고평가 + 저수익성 (피하기)
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                dataKey="per"
                name="PER"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                label={{ value: "PER (배)", position: "insideBottom", offset: -10, fill: "#9ca3af", fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="roe"
                name="ROE"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickFormatter={(v) => `${v}%`}
                label={{ value: "ROE (%)", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
              />
              <ZAxis range={[20, 200]} dataKey="marketCap" name="시가총액" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const d = payload[0].payload as any;
                  return (
                    <div className="rounded border border-gray-700 bg-gray-900 p-2 text-xs">
                      <p className="font-mono font-bold text-blue-400">{d.ticker}</p>
                      <p>PER: {d.per}x</p>
                      <p>ROE: {d.roe}%</p>
                      <p>시총: {fmt(d.marketCap, "$")}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData}>
                {scatterData.map((entry, i) => {
                  const score = entry.roe - entry.per;
                  const color = score > 10 ? "#10B981" : score > 0 ? "#3B82F6" : score > -10 ? "#F59E0B" : "#EF4444";
                  return <Cell key={i} fill={color} fillOpacity={0.6} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* 재무제표 테이블 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">
          재무제표 ({sortedData.length}개)
          <span className="ml-2 text-xs text-gray-500">컬럼 클릭하여 정렬</span>
        </h2>
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-700 text-xs text-gray-400">
              <tr>
                {sortHeader("종목", "ticker", "left")}
                {sortHeader("이름", "name", "left")}
                {sortHeader("섹터", "sector", "left")}
                {sortHeader("시총", "marketCap")}
                {sortHeader("PER", "trailingPE")}
                {sortHeader("PBR", "priceToBook")}
                {sortHeader("ROE", "returnOnEquity")}
                {sortHeader("배당", "dividendYield")}
              </tr>
            </thead>
            <tbody>
              {sortedData.slice(0, 200).map((d) => (
                <tr key={d.ticker} className="border-b border-gray-800">
                  <td className="py-2 font-mono font-bold">{d.ticker}</td>
                  <td className="py-2 text-gray-400 max-w-[200px] truncate">{d.name}</td>
                  <td className="py-2 text-xs text-gray-500">{d.sector}</td>
                  <td className="py-2 text-right font-mono text-gray-300">{fmt(d.marketCap, "$")}</td>
                  <td className="py-2 text-right font-mono text-gray-300">{fmt(d.trailingPE, "x")}</td>
                  <td className="py-2 text-right font-mono text-gray-300">{fmt(d.priceToBook, "x")}</td>
                  <td className={`py-2 text-right font-mono ${(d.returnOnEquity ?? 0) > 0.15 ? "text-green-400" : "text-gray-300"}`}>
                    {fmt(d.returnOnEquity, "%")}
                  </td>
                  <td className={`py-2 text-right font-mono ${(d.dividendYield ?? 0) > 0.03 ? "text-blue-400" : "text-gray-300"}`}>
                    {fmt(d.dividendYield, "%")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedData.length > 200 && (
            <p className="mt-2 text-center text-xs text-gray-500">상위 200개 표시 중 (전체 {sortedData.length}개)</p>
          )}
        </div>
      </section>

      {/* 안내 */}
      <section className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs text-gray-500">
        <p>
          <span className="text-gray-400">데이터 형식:</span>{" "}
          이 페이지는 OHLCV 시계열이 아닌 <span className="text-blue-400">재무 단면(snapshot) 데이터</span>를 처리합니다.
          가격 차트와는 다른 데이터 구조이지만 동일한 Skills 기반 시스템에서 작동합니다 — 어댑터 패턴의 진가입니다.
        </p>
      </section>
    </div>
  );
}
