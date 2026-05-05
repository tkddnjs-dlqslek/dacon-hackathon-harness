"use client";

import { useState } from "react";
import type { QueryResult } from "@/lib/nlq-engine";
import { EXAMPLE_QUERIES } from "@/lib/nlq-engine";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/types";

function formatValue(label: string, value: number): string {
  if (label === "상관계수" || label === "샤프") return value.toFixed(2);
  return `${(value * 100).toFixed(1)}%`;
}

export default function AskPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setQuery(q);
    setResult(null);
    try {
      const res = await fetch("/api/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      setResult(await res.json());
    } catch (e) {
      setResult({ type: "error", message: e instanceof Error ? e.message : "에러 발생" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">자연어 질문</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          한국어로 질문하면 룰 기반 NLQ 엔진이 자산 데이터를 즉시 검색합니다.
          <span className="ml-2 text-xs text-gray-400">외부 API 키 불필요 · 결정론적 응답</span>
        </p>
      </div>

      {/* 입력 */}
      <section className="rounded border border-gray-200 bg-gray-50 p-3">
        <form onSubmit={(e) => { e.preventDefault(); submit(query); }} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 기술주 중 변동성 가장 낮은 5개"
            className="flex-1 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {loading ? "분석 중…" : "질문"}
          </button>
        </form>
      </section>

      {/* 예시 */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => submit(q)}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 결과 */}
      {result && (
        <section className="rounded border border-gray-200 bg-white p-4">
          {result.type === "error" ? (
            <p className="text-red-600 text-sm">⚠ {result.message}</p>
          ) : (
            <>
              {result.interpretedQuery && (
                <p className="mb-3 text-xs text-gray-500">
                  해석: <span className="text-gray-800">{result.interpretedQuery}</span>
                </p>
              )}
              {result.items && result.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>분류</th>
                        <th>종목</th>
                        <th>이름</th>
                        <th className="text-right">{result.items[0].valueLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item, i) => (
                        <tr key={item.ticker}>
                          <td className="text-gray-400">{i + 1}</td>
                          <td>
                            <span
                              className="inline-block h-2 w-2 rounded-full mr-1"
                              style={{ backgroundColor: ASSET_CLASS_COLORS[item.assetType] }}
                            />
                            <span className="text-xs text-gray-500">{ASSET_CLASS_LABELS[item.assetType]}</span>
                          </td>
                          <td className="font-mono font-bold">{item.ticker}</td>
                          <td className="text-gray-500">{item.name}</td>
                          <td className="text-right font-mono text-gray-700">
                            {formatValue(item.valueLabel, item.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">조건에 맞는 자산이 없습니다</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
