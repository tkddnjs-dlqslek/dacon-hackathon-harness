// 데이터 로딩 — data/ 폴더의 정적 JSON 읽기
// yfinance collect.py로 생성된 JSON을 소비

import type { ETFTimeSeries, ETFMetadata } from "@/types";

const DATA_BASE = "/data";

export async function loadETFPrices(): Promise<ETFTimeSeries[]> {
  const res = await fetch(`${DATA_BASE}/etf-prices.json`);
  if (!res.ok) throw new Error("ETF price data not found");
  return res.json();
}

export async function loadStockPrices(): Promise<ETFTimeSeries[]> {
  const res = await fetch(`${DATA_BASE}/stock-prices.json`);
  if (!res.ok) throw new Error("Stock price data not found");
  return res.json();
}

export async function loadETFMetadata(): Promise<ETFMetadata[]> {
  const res = await fetch(`${DATA_BASE}/etf-metadata.json`);
  if (!res.ok) throw new Error("ETF metadata not found");
  return res.json();
}

export async function loadRiskFreeRate(): Promise<number> {
  try {
    const res = await fetch(`${DATA_BASE}/risk-free-rate.json`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.rate / 100; // ^IRX는 %단위, 소수로 변환
  } catch {
    return 0.04; // fallback: 4.0%
  }
}
