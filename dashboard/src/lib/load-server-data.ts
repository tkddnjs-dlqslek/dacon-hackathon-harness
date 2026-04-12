// 서버 사이드 데이터 로딩 — 통일 스키마 (v3)

import { readFile } from "fs/promises";
import path from "path";
import type { Asset, ETFMetadata, AssetType, UniverseAsset } from "@/types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJSON<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

export async function loadAllAssets(): Promise<Asset[]> {
  return readJSON<Asset[]>("assets.json");
}

export async function loadAssetsByType(type: AssetType): Promise<Asset[]> {
  const all = await loadAllAssets();
  return all.filter((a) => a.assetType === type);
}

export async function loadStocks(): Promise<Asset[]> {
  return readJSON<Asset[]>("stocks.json");
}

export async function loadETFMetadata(): Promise<ETFMetadata[]> {
  return readJSON<ETFMetadata[]>("etf-metadata.json");
}

export async function loadUniverse(): Promise<UniverseAsset[]> {
  return readJSON<UniverseAsset[]>("universe.json");
}

export async function loadRiskFreeRate(): Promise<number> {
  // ^IRX 자산에서 가져옴 (bond 자산 클래스)
  try {
    const all = await loadAllAssets();
    const irx = all.find((a) => a.ticker === "^IRX");
    if (irx && irx.data.length > 0) {
      return irx.data[irx.data.length - 1].close / 100;
    }
  } catch {}
  return 0.04;
}

export async function loadMeta(): Promise<{ lastUpdated: string; assetClasses: string[]; totalAssets: number }> {
  return readJSON("meta.json");
}

// ── 하위 호환 별칭 (기존 sector/portfolio/compare 페이지용) ──

export async function loadETFPrices(): Promise<Asset[]> {
  // equity_etf 자산 클래스만 반환 (기존 페이지가 가정하던 동작)
  return loadAssetsByType("equity_etf");
}

export async function loadStockPrices(): Promise<Asset[]> {
  return loadStocks();
}
