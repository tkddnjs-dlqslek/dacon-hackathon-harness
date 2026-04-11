// 서버 사이드 데이터 로딩 — JSON 파일 직접 읽기 (API Route 불필요)

import { readFile } from "fs/promises";
import path from "path";
import type { ETFTimeSeries, ETFMetadata } from "@/types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJSON<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

export async function loadETFPrices(): Promise<ETFTimeSeries[]> {
  return readJSON<ETFTimeSeries[]>("etf-prices.json");
}

export async function loadStockPrices(): Promise<ETFTimeSeries[]> {
  return readJSON<ETFTimeSeries[]>("stock-prices.json");
}

export async function loadETFMetadata(): Promise<ETFMetadata[]> {
  return readJSON<ETFMetadata[]>("etf-metadata.json");
}

export async function loadRiskFreeRate(): Promise<number> {
  try {
    const data = await readJSON<{ rate: number }>("risk-free-rate.json");
    return data.rate / 100;
  } catch {
    return 0.04;
  }
}

export async function loadLastUpdated(): Promise<string> {
  try {
    const data = await readJSON<{ lastUpdated: string }>("last-updated.json");
    return data.lastUpdated;
  } catch {
    return "unknown";
  }
}
