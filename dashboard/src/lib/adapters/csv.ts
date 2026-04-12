// CSV 어댑터 — 사용자 업로드 데이터 처리
//
// 형식 예시:
//   ticker,date,open,high,low,close,volume
//   MYSTOCK,2024-01-01,100.0,102.0,99.5,101.5,1000000
//   MYSTOCK,2024-01-02,101.5,103.0,101.0,102.8,950000
//
// 또는 wide format (yfinance.download CSV):
//   Date,XLK,SPY,...
//   2024-01-01,200.5,500.2,...

import type { DataAdapter, ValidationResult } from "./types";
import { inferAssetTypeFromTicker, validateAsset } from "./types";
import type { Asset, AssetType, OHLCV } from "@/types";

interface CSVRow {
  ticker: string;
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const tickerIdx = header.indexOf("ticker");
  const dateIdx = header.indexOf("date");
  const closeIdx = header.indexOf("close");

  if (tickerIdx === -1 || dateIdx === -1 || closeIdx === -1) {
    throw new Error("CSV must have ticker, date, close columns");
  }

  const openIdx = header.indexOf("open");
  const highIdx = header.indexOf("high");
  const lowIdx = header.indexOf("low");
  const volIdx = header.indexOf("volume");

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const close = parseFloat(cols[closeIdx]);
    return {
      ticker: cols[tickerIdx],
      date: cols[dateIdx],
      close,
      open: openIdx >= 0 ? parseFloat(cols[openIdx]) : close,
      high: highIdx >= 0 ? parseFloat(cols[highIdx]) : close,
      low: lowIdx >= 0 ? parseFloat(cols[lowIdx]) : close,
      volume: volIdx >= 0 ? parseInt(cols[volIdx]) : 0,
    };
  });
}

function rowsToAssets(rows: CSVRow[]): Asset[] {
  const byTicker = new Map<string, CSVRow[]>();
  for (const row of rows) {
    if (!byTicker.has(row.ticker)) byTicker.set(row.ticker, []);
    byTicker.get(row.ticker)!.push(row);
  }

  const assets: Asset[] = [];
  for (const [ticker, ticketRows] of byTicker) {
    const data: OHLCV[] = ticketRows
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: r.date,
        open: r.open ?? r.close,
        high: r.high ?? r.close,
        low: r.low ?? r.close,
        close: r.close,
        volume: r.volume ?? 0,
      }));

    assets.push({
      ticker,
      name: ticker,
      assetType: inferAssetTypeFromTicker(ticker),
      currency: "USD", // CSV는 통화 정보 없으면 USD 가정
      data,
    });
  }
  return assets;
}

export const csvAdapter: DataAdapter = {
  name: "csv",
  supportedTypes: ["equity_etf", "bond", "fx", "commodity", "crypto", "index"],

  async fetch(_tickers: string[], _period: string): Promise<Asset[]> {
    throw new Error("CSV adapter requires text input — use parseCSVText instead");
  },

  validate(asset: Asset): ValidationResult {
    return validateAsset(asset);
  },

  inferType(ticker: string): AssetType {
    return inferAssetTypeFromTicker(ticker);
  },
};

/** CSV 텍스트로부터 자산 배열 생성 */
export function parseCSVText(text: string): Asset[] {
  const rows = parseCSV(text);
  return rowsToAssets(rows);
}
