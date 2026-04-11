// 포트폴리오 구성 (/portfolio) — report-layout.md §1.3

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">포트폴리오</h1>

      {/* A. ETF 선택 & 비중 조정 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">ETF 비중 조정</h2>
        <div className="flex h-[200px] items-center justify-center text-gray-500">
          ETF 슬라이더 (합계 100%)
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:text-white">균등 배분</button>
          <button className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:text-white">시총 비중</button>
          <button className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:text-white">초기화</button>
        </div>
      </section>

      {/* B. 백테스트 수익률 + C. 위험 지표 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">백테스트 수익률</h2>
          <div className="flex h-[300px] items-center justify-center text-gray-500">
            Line Chart (포트폴리오 vs SPY)
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3">
          {["연수익률", "변동성", "샤프 비율", "MDD"].map((label) => (
            <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-2xl font-bold">--</p>
            </div>
          ))}
        </section>
      </div>

      {/* D. 리밸런싱 비교 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">리밸런싱 비교</h2>
          <div className="flex gap-1">
            {["없음", "월간", "분기", "반기", "연간"].map((p) => (
              <button key={p} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          Dual Line: 리밸런싱 vs 바이앤홀드
        </div>
      </section>

      {/* E. 포트폴리오 인사이트 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">인사이트</h2>
        <div className="flex h-[100px] items-center justify-center text-gray-500">
          Portfolio insights
        </div>
      </section>
    </div>
  );
}
