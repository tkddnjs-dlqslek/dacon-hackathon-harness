// 포트폴리오 구성 (/portfolio) — report-layout.md §1.3
// 서버: 데이터 로드 → 클라이언트: 인터랙티브 비중 조정 + 백테스트

import { loadETFPrices, loadRiskFreeRate } from "@/lib/load-server-data";
import PortfolioBuilder from "@/components/portfolio/PortfolioBuilder";

export default async function PortfolioPage() {
  const [etfPrices, riskFreeRate] = await Promise.all([
    loadETFPrices(),
    loadRiskFreeRate(),
  ]);

  const spy = etfPrices.find((e) => e.ticker === "SPY");
  const sectorETFs = etfPrices.filter((e) => e.ticker !== "SPY");

  // 클라이언트 컴포넌트에 전달할 최소 데이터
  const etfInputs = sectorETFs.map((e) => ({
    ticker: e.ticker,
    sector: e.sector,
    data: e.data,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Portfolio</h1>
      <PortfolioBuilder
        etfs={etfInputs}
        spyData={spy?.data ?? sectorETFs[0].data}
        riskFreeRate={riskFreeRate}
      />
    </div>
  );
}
