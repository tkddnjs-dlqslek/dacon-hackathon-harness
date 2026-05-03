// 섹터 상세 (/sector/[id]) — report-layout.md §1.2

import { loadETFPrices, loadETFMetadata, loadStockPrices, loadRiskFreeRate } from "@/lib/load-server-data";
import { computeMetricsWithBenchmark, cumulativeReturns, dailyReturns, volatility, annualizedReturn } from "@/lib/analysis-engine";
import { generateETFInsights, sortInsights } from "@/lib/insight-generator";
import { CumulativeReturnChart, SectorDonutChart } from "@/components/charts";
import { SECTOR_COLORS } from "@/types";

// sector slug → sector name 매핑 (데이터 조회용 — 영어 유지)
const SLUG_MAP: Record<string, string> = {
  technology: "Technology",
  energy: "Energy",
  healthcare: "Healthcare",
  financials: "Financials",
  "consumer-disc": "Consumer Disc.",
  industrials: "Industrials",
  "real-estate": "Real Estate",
  utilities: "Utilities",
  "consumer-staples": "Consumer Staples",
  materials: "Materials",
  communication: "Communication",
};

// 표시용 한국어 이름
const SLUG_KO: Record<string, string> = {
  technology: "기술",
  energy: "에너지",
  healthcare: "헬스케어",
  financials: "금융",
  "consumer-disc": "임의소비재",
  industrials: "산업재",
  "real-estate": "부동산",
  utilities: "유틸리티",
  "consumer-staples": "필수소비재",
  materials: "소재",
  communication: "통신",
};

interface SectorPageProps {
  params: Promise<{ id: string }>;
}

export default async function SectorPage({ params }: SectorPageProps) {
  const { id } = await params;
  const sectorName = SLUG_MAP[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
  const sectorNameKo = SLUG_KO[id] ?? sectorName;

  const [etfPrices, metadata, stockPrices, riskFreeRate] = await Promise.all([
    loadETFPrices(),
    loadETFMetadata(),
    loadStockPrices(),
    loadRiskFreeRate(),
  ]);

  const spy = etfPrices.find((e) => e.ticker === "SPY");
  const etf = etfPrices.find((e) => e.sector === sectorName);
  const meta = metadata.find((m) => m.sector === sectorName);

  if (!etf || !meta) {
    return <div className="py-12 text-center text-gray-500">섹터를 찾을 수 없습니다: {sectorNameKo}</div>;
  }

  // ETF 지표
  const metrics = computeMetricsWithBenchmark(etf.ticker, "equity_etf", etf.data, spy?.data ?? etf.data, riskFreeRate);

  // 상위 종목 데이터
  const holdingSymbols = meta.topHoldings.slice(0, 5).map((h) => h.symbol);
  const holdingStocks = holdingSymbols
    .map((sym) => stockPrices.find((s) => s.ticker === sym))
    .filter(Boolean) as typeof stockPrices;

  // 누적 수익률 차트 (ETF + 상위 종목)
  const chartDates = etf.data.map((d) => d.date);
  const chartSeries = [
    { ticker: etf.ticker, sector: sectorName, cumulativeReturns: cumulativeReturns(etf.data) },
    ...holdingStocks.map((s) => ({
      ticker: s.ticker,
      sector: sectorName,
      cumulativeReturns: cumulativeReturns(s.data.slice(-etf.data.length)),
    })),
  ];

  // Holdings donut
  const holdingsDonut = meta.topHoldings.slice(0, 10).map((h) => ({
    sector: h.symbol,
    weight: h.weight,
  }));

  // 종목별 지표
  const stockMetrics = holdingStocks.map((s) => {
    const data = s.data.slice(-etf.data.length);
    const ret = data.length >= 2 ? data[data.length - 1].close / data[0].close - 1 : 0;
    return {
      ticker: s.ticker,
      weight: meta.topHoldings.find((h) => h.symbol === s.ticker)?.weight ?? 0,
      returnPct: ret,
      vol: volatility(data),
    };
  });

  // 인사이트
  const insights = sortInsights(generateETFInsights(metrics));

  const insightColors: Record<string, string> = {
    danger: "border-red-200 bg-red-50 text-red-700",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
    success: "border-green-300 bg-green-50 text-green-700",
    info: "border-gray-200 bg-gray-50 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        대시보드 &gt; 섹터 &gt; <span className="text-gray-900">{sectorNameKo}</span>
        <span className="ml-2 text-gray-600">({etf.ticker})</span>
      </div>

      {/* A. 섹터 요약 KPI + B. 구성 비중 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="grid grid-cols-2 gap-3">
          {[
            { label: "1년 수익률", value: `${(metrics.returnPeriod["1Y"] * 100).toFixed(1)}%`, positive: metrics.returnPeriod["1Y"] >= 0 },
            { label: "변동성", value: `${(metrics.volatility * 100).toFixed(1)}%` },
            { label: "샤프", value: metrics.sharpe.toFixed(2), positive: metrics.sharpe > 1 },
            { label: "최대 낙폭", value: `${(metrics.mdd * 100).toFixed(1)}%` },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold ${kpi.positive ? "text-green-400" : kpi.value.startsWith("-") ? "text-red-400" : "text-gray-900"}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </section>
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">상위 10개 구성 종목</h2>
          <SectorDonutChart data={holdingsDonut} />
        </section>
      </div>

      {/* C. 가격 추이 */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-3 font-semibold">{sectorNameKo} 누적 수익률 비교</h2>
        <CumulativeReturnChart dates={chartDates} series={chartSeries} />
      </section>

      {/* D. 종목별 성과 테이블 */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-3 font-semibold">구성 종목 성과</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs text-gray-500">
            <tr>
              <th className="pb-2">종목</th>
              <th className="pb-2 text-right">비중</th>
              <th className="pb-2 text-right">수익률</th>
              <th className="pb-2 text-right">변동성</th>
            </tr>
          </thead>
          <tbody>
            {stockMetrics.map((s) => (
              <tr key={s.ticker} className="border-b border-gray-200">
                <td className="py-2 font-mono font-bold">{s.ticker}</td>
                <td className="py-2 text-right font-mono text-gray-600">{(s.weight * 100).toFixed(1)}%</td>
                <td className={`py-2 text-right font-mono ${s.returnPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {(s.returnPct * 100).toFixed(1)}%
                </td>
                <td className="py-2 text-right font-mono text-gray-600">{(s.vol * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* F. 인사이트 */}
      {insights.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">인사이트</h2>
          {insights.map((ins, i) => (
            <div key={i} className={`rounded-lg border p-3 text-sm ${insightColors[ins.level]}`}>
              {ins.message}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
