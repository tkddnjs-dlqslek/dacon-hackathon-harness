// 자연어 쿼리 API — 패턴 매칭 기반 (API 키 불필요)

import { NextResponse } from "next/server";
import { loadAllAssets } from "@/lib/load-server-data";
import { executeQuery } from "@/lib/nlq-engine";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ type: "error", message: "query가 필요합니다" }, { status: 400 });
    }

    const assets = await loadAllAssets();
    const result = executeQuery(query, assets);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ type: "error", message }, { status: 500 });
  }
}
