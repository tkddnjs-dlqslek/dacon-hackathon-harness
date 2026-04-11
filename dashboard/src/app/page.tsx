// 메인 대시보드 (/) — report-layout.md §1.1
// 섹션 A~H: 인사이트 배너, KPI, 섹터 비중, 누적 수익률, 랭킹, 테이블, 히트맵, 리밸런싱

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {/* A. 인사이트 요약 배너 */}
      <section className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="min-w-[240px] rounded-lg border border-gray-800 bg-gray-900 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-700" />
            <div className="mt-2 h-3 w-full animate-pulse rounded bg-gray-800" />
          </div>
        ))}
      </section>

      {/* B. 시장 요약 KPI + C. 섹터 비중 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="grid grid-cols-2 gap-3">
          {["총수익률", "변동성", "샤프 비율", "MDD"].map((label) => (
            <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-2xl font-bold">--</p>
            </div>
          ))}
        </section>
        <section className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-gray-500">섹터 비중 Donut Chart</p>
        </section>
      </div>

      {/* D. 포트폴리오 누적 수익률 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">포트폴리오 누적 수익률</h2>
          <div className="flex gap-1">
            {["1M", "3M", "6M", "1Y", "YTD", "ALL"].map((p) => (
              <button key={p} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          Multi-Line Chart (11 ETF + SPY)
        </div>
      </section>

      {/* E. 섹터별 수익률 + F. ETF 성과 테이블 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">섹터별 수익률 랭킹</h2>
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            Horizontal Bar Chart
          </div>
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">ETF 성과</h2>
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            Performance Table + Sparklines
          </div>
        </section>
      </div>

      {/* G. 상관관계 히트맵 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">섹터 간 상관관계</h2>
        <div className="flex h-[350px] items-center justify-center text-gray-500">
          Heatmap (11x11)
        </div>
      </section>

      {/* H. 리밸런싱 시뮬레이션 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">리밸런싱 시뮬레이션</h2>
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          비중 슬라이더 + Dual Line Chart
        </div>
      </section>
    </div>
  );
}
