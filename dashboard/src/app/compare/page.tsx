// ETF vs 직접투자 비교 (/compare) — report-layout.md §1.4

import { loadETFPrices, loadETFMetadata, loadStockPrices, loadRiskFreeRate } from "@/lib/load-server-data";
import ComparePanel from "@/components/compare/ComparePanel";

export default async function ComparePage() {
  const [etfPrices, metadata, stockPrices, riskFreeRate] = await Promise.all([
    loadETFPrices(),
    loadETFMetadata(),
    loadStockPrices(),
    loadRiskFreeRate(),
  ]);

  const sectorETFs = etfPrices.filter((e) => e.ticker !== "SPY");

  // 섹터별로 ETF + 해당 개별종목 묶기
  const sectors = sectorETFs.map((etf) => {
    const meta = metadata.find((m) => m.ticker === etf.ticker);
    const holdingSymbols = meta?.topHoldings.slice(0, 10).map((h) => h.symbol) ?? [];
    const stocks = holdingSymbols
      .map((sym) => {
        const sp = stockPrices.find((s) => s.ticker === sym);
        return sp ? { ticker: sp.ticker, data: sp.data } : null;
      })
      .filter(Boolean) as { ticker: string; data: typeof etf.data }[];

    return {
      sector: etf.sector,
      etfTicker: etf.ticker,
      etfData: etf.data,
      stocks,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ETF vs Direct Investment</h1>
      <ComparePanel sectors={sectors} metadata={metadata} riskFreeRate={riskFreeRate} />
    </div>
  );
}
