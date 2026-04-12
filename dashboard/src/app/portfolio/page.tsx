// 포트폴리오 구성 (/portfolio) — report-layout.md §1.3
// 서버: 데이터 로드 → 클라이언트: 인터랙티브 비중 조정 + 백테스트

import { Suspense } from "react";
import { loadETFPrices, loadRiskFreeRate } from "@/lib/load-server-data";
import PortfolioBuilder from "@/components/portfolio/PortfolioBuilder";
import EfficientFrontier from "@/components/portfolio/EfficientFrontier";

export default async function PortfolioPage() {
  const [etfPrices, riskFreeRate] = await Promise.all([
    loadETFPrices(),
    loadRiskFreeRate(),
  ]);

  const spy = etfPrices.find((e) => e.ticker === "SPY");
  const sectorETFs = etfPrices.filter((e) => e.ticker !== "SPY");

  const etfInputs = sectorETFs.map((e) => ({
    ticker: e.ticker,
    sector: e.sector ?? "Unknown",
    data: e.data,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">포트폴리오</h1>
      <Suspense fallback={<div className="text-gray-500">로딩 중...</div>}>
        <PortfolioBuilder
          etfs={etfInputs}
          spyData={spy?.data ?? sectorETFs[0].data}
          riskFreeRate={riskFreeRate}
        />
      </Suspense>
      <EfficientFrontier etfs={etfInputs} riskFreeRate={riskFreeRate} />
    </div>
  );
}
