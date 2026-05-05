"use client";

import dynamic from "next/dynamic";
import type { OHLCV } from "@/types";

interface ETFInput {
  ticker: string;
  sector: string;
  data: OHLCV[];
}

const EfficientFrontier = dynamic(
  () => import("./EfficientFrontier"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        효율적 프론티어 계산 중…
      </div>
    ),
  }
);

export default function EfficientFrontierClient({
  etfs,
  riskFreeRate,
}: {
  etfs: ETFInput[];
  riskFreeRate: number;
}) {
  return <EfficientFrontier etfs={etfs} riskFreeRate={riskFreeRate} />;
}
