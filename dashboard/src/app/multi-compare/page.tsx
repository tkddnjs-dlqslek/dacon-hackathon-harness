// 자유 비교 빌더 — 자산 클래스 횡단

import { loadAllAssets } from "@/lib/load-server-data";
import MultiCompareClient from "@/components/multi-compare/MultiCompareClient";

export default async function MultiComparePage() {
  const assets = await loadAllAssets();

  const lite = assets.map((a) => ({
    ticker: a.ticker,
    name: a.name,
    assetType: a.assetType,
    data: a.data,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">자산 비교 빌더</h1>
        <p className="mt-1 text-sm text-gray-500">
          자산 클래스를 가로질러 어떤 자산이든 자유롭게 골라 비교하세요. (예: 비트코인 vs 금 vs S&P 500)
        </p>
      </div>
      <MultiCompareClient assets={lite} />
    </div>
  );
}
