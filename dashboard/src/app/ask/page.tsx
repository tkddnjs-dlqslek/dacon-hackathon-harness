// 자연어 쿼리 페이지 — "기술주 중 변동성 가장 낮은 5개" 같은 질문

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
    try {
      const res = await fetch("/api/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ type: "error", message: e instanceof Error ? e.message : "에러 발생" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">자연어 질문</h1>
        <p className="mt-1 text-sm text-gray-500">
          한국어로 질문하면 즉석에서 답합니다. 패턴 매칭 엔진으로 작동하며 외부 API 키가 필요 없습니다.
        </p>
      </div>

      {/* 입력 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <form onSubmit={(e) => { e.preventDefault(); submit(query); }} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 기술주 중 변동성 가장 낮은 5개"
            className="flex-1 rounded bg-gray-800 px-4 py-2 text-white placeholder-gray-500"
            autoFocus
          />
          <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50">
            {loading ? "분석 중..." : "질문하기"}
          </button>
        </form>
      </section>

      {/* 예시 쿼리 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-2 text-xs text-gray-400">예시 질문 (클릭하면 자동 입력)</h2>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((q) => (
            <button key={q} onClick={() => submit(q)}
              className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:border-blue-500 hover:text-white">
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* 결과 */}
      {result && (
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          {result.type === "error" ? (
            <p className="text-red-400">⚠ {result.message}</p>
          ) : (
            <>
              {result.interpretedQuery && (
                <p className="mb-3 text-sm text-gray-400">
                  해석: <span className="text-white">{result.interpretedQuery}</span>
                </p>
              )}
              {result.items && result.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-700 text-xs text-gray-400">
                      <tr>
                        <th className="pb-2 w-12">순위</th>
                        <th className="pb-2">분류</th>
                        <th className="pb-2">종목</th>
                        <th className="pb-2">이름</th>
                        <th className="pb-2 text-right">{result.items[0].valueLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item, i) => (
                        <tr key={item.ticker} className="border-b border-gray-800">
                          <td className="py-2 text-gray-500">{i + 1}</td>
                          <td className="py-2">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[item.assetType] }} />
                            {" "}<span className="text-xs text-gray-500">{ASSET_CLASS_LABELS[item.assetType]}</span>
                          </td>
                          <td className="py-2 font-mono font-bold">{item.ticker}</td>
                          <td className="py-2 text-gray-400">{item.name}</td>
                          <td className="py-2 text-right font-mono text-gray-300">
                            {formatValue(item.valueLabel, item.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">조건에 맞는 자산이 없습니다</p>
              )}
            </>
          )}
        </section>
      )}

      {/* 안내 */}
      <section className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs text-gray-500">
        <p className="mb-1"><span className="text-gray-400">지원 패턴:</span></p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>자산 클래스 필터: 주식, 채권, 외환, 원자재, 암호화폐, 지수</li>
          <li>지역 필터: 한국</li>
          <li>지표: 수익률, 변동성, 샤프 비율, MDD, 상관관계</li>
          <li>임계값: "30% 이상", "1.5 이하" 등</li>
          <li>방향: "가장 높은", "가장 낮은", "TOP N"</li>
        </ul>
      </section>
    </div>
  );
}
