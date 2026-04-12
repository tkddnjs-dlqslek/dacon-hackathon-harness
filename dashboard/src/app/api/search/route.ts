// 종목 검색 자동완성 — yahoo-finance2 search API

import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
const YF = require("yahoo-finance2").default;
const yahooFinance: any = new YF();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const result = await yahooFinance.search(q, { quotesCount: 10, newsCount: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (result.quotes ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((quote: any) => "symbol" in quote && typeof quote.symbol === "string")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname ?? quote.longname ?? quote.symbol,
        type: quote.quoteType ?? "EQUITY",
        exchange: quote.exchange ?? "",
      }));

    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
