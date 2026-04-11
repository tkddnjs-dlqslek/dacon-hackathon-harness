// 섹터 상세 (/sector/[id]) — report-layout.md §1.2

interface SectorPageProps {
  params: Promise<{ id: string }>;
}

export default async function SectorPage({ params }: SectorPageProps) {
  const { id } = await params;
  const sectorName = id.charAt(0).toUpperCase() + id.slice(1);

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-400">
        대시보드 &gt; 섹터 &gt; <span className="text-white">{sectorName}</span>
      </div>

      {/* A. 섹터 요약 KPI + B. 섹터 구성 비중 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="grid grid-cols-2 gap-3">
          {["수익률", "변동성", "샤프 비율", "MDD"].map((label) => (
            <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-2xl font-bold">--</p>
            </div>
          ))}
        </section>
        <section className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-gray-500">Top 10 Holdings Donut</p>
        </section>
      </div>

      {/* C. 가격 추이 비교 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{sectorName} 가격 추이</h2>
          <div className="flex gap-1">
            {["1M", "3M", "6M", "1Y", "YTD", "ALL"].map((p) => (
              <button key={p} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          Multi-Line: ETF + 상위 5 구성종목
        </div>
      </section>

      {/* D. 종목별 성과 테이블 + E. 수익률 분포 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">종목별 성과</h2>
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            Stock Table
          </div>
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 font-semibold">일간 수익률 분포</h2>
          <div className="flex h-[250px] items-center justify-center text-gray-500">
            Histogram
          </div>
        </section>
      </div>

      {/* F. 섹터 인사이트 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 font-semibold">인사이트</h2>
        <div className="flex h-[100px] items-center justify-center text-gray-500">
          Sector-filtered insights
        </div>
      </section>
    </div>
  );
}
