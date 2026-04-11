// ETF vs 직접투자 비교 (/compare) — report-layout.md §1.4

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ETF vs 직접투자 비교</h1>

      {/* A. 비교 설정 패널 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="text-xs text-gray-400">섹터</label>
            <p className="mt-1 text-sm">Technology</p>
          </div>
          <div>
            <label className="text-xs text-gray-400">종목 수</label>
            <div className="mt-1 flex gap-1">
              {[3, 5, 10, 20].map((n) => (
                <button key={n} className="rounded px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">비중 방식</label>
            <p className="mt-1 text-sm">균등</p>
          </div>
          <div>
            <label className="text-xs text-gray-400">리밸런싱</label>
            <p className="mt-1 text-sm">분기</p>
          </div>
          <div>
            <label className="text-xs text-gray-400">기간</label>
            <div className="mt-1 flex gap-1">
              {["1Y", "3Y", "5Y"].map((p) => (
                <button key={p} className="rounded px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">초기 투자금</label>
            <p className="mt-1 text-sm">$10,000</p>
          </div>
        </div>
      </section>

      {/* B. 핵심 비교 요약 (ETF vs 직접투자) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-blue-900/50 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-blue-400">ETF (XLK)</h2>
          <div className="grid grid-cols-2 gap-3">
            {["수익률", "변동성", "샤프 비율", "MDD"].map((label) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-lg font-bold">--</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-orange-900/50 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-orange-400">직접투자 (Top 5)</h2>
          <div className="grid grid-cols-2 gap-3">
            {["수익률", "변동성", "샤프 비율", "MDD"].map((label) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-lg font-bold">--</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* C. 누적 수익률 비교 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">누적 수익률 비교</h2>
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          Dual Line: ETF(실선) vs 직접투자(점선)
        </div>
      </section>

      {/* D. 비용 누적 비교 + E. 지표별 비교 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">비용 누적 비교</h2>
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            Stacked Area: ETF 보수 vs 거래비용
          </div>
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">지표별 비교</h2>
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            Grouped Bar Chart
          </div>
        </section>
      </div>

      {/* F. 직접투자 포트폴리오 구성 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">직접투자 포트폴리오 구성</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-xs text-gray-400">
              <tr>
                <th className="pb-2">종목</th>
                <th className="pb-2">비중</th>
                <th className="pb-2">수익률</th>
                <th className="pb-2">변동성</th>
                <th className="pb-2">기여도</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">데이터 로딩 대기</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* G. 비교 인사이트 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">비교 인사이트</h2>
        <div className="flex h-[100px] items-center justify-center text-gray-500">
          Compare insights
        </div>
      </section>
    </div>
  );
}
