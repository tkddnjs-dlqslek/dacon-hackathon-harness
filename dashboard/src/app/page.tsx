// 메인 대시보드 (/) — 서버: 데이터 로드 → 클라이언트: 기간 필터 인터랙션

import { loadETFPrices, loadETFMetadata, loadRiskFreeRate } from "@/lib/load-server-data";
import { computeMetricsWithBenchmark, dailyReturns, correlationMatrix } from "@/lib/analysis-engine";
import { topInsights, generateETFInsights, generateSectorInsights } from "@/lib/insight-generator";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const [etfPrices, metadata, riskFreeRate] = await Promise.all([
    loadETFPrices(),
    loadETFMetadata(),
    loadRiskFreeRate(),
  ]);

  const spy = etfPrices.find((e) => e.ticker === "SPY");
  const sectorETFs = etfPrices.filter((e) => e.ticker !== "SPY");

  const allMetrics = sectorETFs.map((etf) =>
    computeMetricsWithBenchmark(etf.ticker, etf.data, spy?.data ?? etf.data, riskFreeRate)
  );

  const allReturns = sectorETFs.map((etf) => dailyReturns(etf.data));
  const corrMatrix = correlationMatrix(allReturns);

  const etfInsights = allMetrics.flatMap((m) => generateETFInsights(m));
  const sectorInsights = generateSectorInsights(
    sectorETFs.map((etf, i) => ({ sector: etf.sector, return3m: allMetrics[i].returnPeriod["3M"] }))
  );
  const insights = topInsights([...etfInsights, ...sectorInsights], 5);

  const sectorWeights = sectorETFs.map((etf) => ({ sector: etf.sector, weight: 1 / sectorETFs.length }));

  return (
    <DashboardClient
      sectorETFs={sectorETFs.map((e) => ({ ticker: e.ticker, sector: e.sector, data: e.data }))}
      allMetricsFull={allMetrics}
      corrMatrix={corrMatrix}
      insights={insights}
      sectorWeights={sectorWeights}
    />
  );
}
