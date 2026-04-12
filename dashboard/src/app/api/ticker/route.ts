// 실시간 티커 데이터 API — yahoo-finance2 어댑터
//
// GET /api/ticker?symbol=AAPL&period=2y
// 응답: Asset 통일 스키마

import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
const YF = require("yahoo-finance2").default;
const yahooFinance: any = new YF();
import type { Asset, OHLCV } from "@/types";
import { inferAssetTypeFromTicker } from "@/lib/adapters";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const period = searchParams.get("period") ?? "2y";

  if (!symbol) {
    return NextResponse.json({ error: "symbol parameter required" }, { status: 400 });
  }

  try {
    // 기간 → 시작일 변환
    const periodDays: Record<string, number> = {
      "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
    };
    const days = periodDays[period] ?? 730;
    const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 가격 데이터
    const result = await yahooFinance.chart(symbol, {
      period1,
      interval: "1d",
    });

    if (!result.quotes || result.quotes.length === 0) {
      return NextResponse.json({ error: "no data" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: OHLCV[] = result.quotes
      .filter((q: any) => q.close !== null && q.close !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((q: any) => ({
        date: q.date.toISOString().slice(0, 10),
        open: Number(q.open ?? q.close ?? 0),
        high: Number(q.high ?? q.close ?? 0),
        low: Number(q.low ?? q.close ?? 0),
        close: Number(q.close ?? 0),
        volume: Number(q.volume ?? 0),
      }));

    if (data.length < 30) {
      return NextResponse.json({ error: "insufficient data (< 30 days)" }, { status: 404 });
    }

    // 기본 메타 (quote)
    let name = symbol;
    let currency = "USD";
    try {
      const quote = await yahooFinance.quote(symbol);
      name = quote.shortName ?? quote.longName ?? symbol;
      currency = quote.currency ?? "USD";
    } catch {}

    const asset: Asset = {
      ticker: symbol,
      name,
      assetType: inferAssetTypeFromTicker(symbol),
      currency,
      data,
    };

    return NextResponse.json(asset);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
