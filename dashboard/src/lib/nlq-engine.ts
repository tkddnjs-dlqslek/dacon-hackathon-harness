// 자연어 쿼리 엔진 — 패턴 매칭 기반 (API 키 불필요)
//
// 지원 패턴:
// - "기술주 중 변동성 가장 낮은 5개"
// - "최근 1년 수익률 1위"
// - "BTC와 상관관계 가장 높은 자산"
// - "주식 중 샤프 비율 1.5 이상"
// - "변동성 30% 이상인 자산"
// - "한국 주식 톱5"

import type { Asset, AssetType, OHLCV } from "@/types";
import { ASSET_CLASS_LABELS } from "@/types";

export interface QueryResult {
  type: "list" | "single" | "error";
  message?: string;
  items?: { ticker: string; name: string; assetType: AssetType; value: number; valueLabel: string }[];
  interpretedQuery?: string;
}

interface AssetWithMetrics {
  asset: Asset;
  return1Y: number;
  volatility: number;
  sharpe: number;
  mdd: number;
  beta?: number;
}

function calc(asset: Asset): AssetWithMetrics | null {
  const data = asset.data.slice(-252);
  if (data.length < 30) return null;
  const ret = data[data.length - 1].close / data[0].close - 1;
  const drs: number[] = [];
  for (let i = 1; i < data.length; i++) drs.push(data[i].close / data[i - 1].close - 1);
  const mean = drs.reduce((a, b) => a + b, 0) / drs.length;
  const vol = Math.sqrt(drs.reduce((s, r) => s + (r - mean) ** 2, 0) / (drs.length - 1)) * Math.sqrt(252);
  const annRet = Math.pow(1 + ret, 252 / data.length) - 1;
  const sharpe = vol === 0 ? 0 : (annRet - 0.04) / vol;
  let peak = data[0].close, mdd = 0;
  for (const d of data) { if (d.close > peak) peak = d.close; const dd = (d.close - peak) / peak; if (dd < mdd) mdd = dd; }
  return { asset, return1Y: ret, volatility: vol, sharpe, mdd };
}

function dailyReturns(data: OHLCV[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < data.length; i++) r.push(data[i].close / data[i - 1].close - 1);
  return r;
}

function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  const A = a.slice(-n), B = b.slice(-n);
  const mA = A.reduce((s, v) => s + v, 0) / n;
  const mB = B.reduce((s, v) => s + v, 0) / n;
  let cov = 0, vA = 0, vB = 0;
  for (let i = 0; i < n; i++) {
    cov += (A[i] - mA) * (B[i] - mB);
    vA += (A[i] - mA) ** 2;
    vB += (B[i] - mB) ** 2;
  }
  const denom = Math.sqrt(vA * vB);
  return denom === 0 ? 0 : cov / denom;
}

// 키워드 → 자산 클래스 매핑
function detectAssetClass(query: string): AssetType[] | null {
  const map: { keywords: string[]; type: AssetType }[] = [
    { keywords: ["기술주", "주식", "stock", "주식/etf", "etf"], type: "equity_etf" },
    { keywords: ["채권", "국채", "bond", "금리", "yield"], type: "bond" },
    { keywords: ["외환", "환율", "fx", "달러"], type: "fx" },
    { keywords: ["원자재", "commodity", "금", "은", "원유"], type: "commodity" },
    { keywords: ["암호화폐", "코인", "crypto", "비트코인", "btc", "이더"], type: "crypto" },
    { keywords: ["지수", "index", "코스피", "닛케이", "s&p"], type: "index" },
  ];

  const q = query.toLowerCase();
  const matched: AssetType[] = [];
  for (const m of map) {
    if (m.keywords.some((k) => q.includes(k))) matched.push(m.type);
  }
  return matched.length > 0 ? matched : null;
}

// 한국 자산 필터
function isKoreanAsset(asset: Asset): boolean {
  return asset.ticker.endsWith(".KS") || asset.ticker === "^KS11" || asset.ticker === "^KQ11";
}

// 정렬 방향 추출
function detectDirection(query: string): "asc" | "desc" {
  if (/낮은|적은|작은|최저|min|lowest|하락/.test(query)) return "asc";
  return "desc";
}

// 톱 N 추출
function detectN(query: string, defaultN = 5): number {
  const m = query.match(/(\d+)\s*(개|위|top)/i);
  if (m) return Math.min(20, Math.max(1, Number(m[1])));
  return defaultN;
}

// 임계값 추출
function detectThreshold(query: string): number | null {
  const m = query.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) / 100 : null;
}

export function executeQuery(query: string, assets: Asset[]): QueryResult {
  const all = assets.map(calc).filter(Boolean) as AssetWithMetrics[];
  if (all.length === 0) return { type: "error", message: "데이터가 없습니다" };

  const q = query.toLowerCase();
  const direction = detectDirection(query);
  const n = detectN(query);

  // 자산 클래스 필터
  let pool = all;
  const types = detectAssetClass(query);
  if (types) {
    pool = pool.filter((x) => types.includes(x.asset.assetType));
  }

  // 한국 필터
  if (/한국|코리아|korea/i.test(query)) {
    pool = pool.filter((x) => isKoreanAsset(x.asset));
  }

  // 패턴 1: 상관관계
  const corrMatch = q.match(/(btc|비트코인|spy|s&p|금|gld)\S*\s*(와|과|with)?\s*상관/);
  if (corrMatch || /상관관계.*높은|상관관계.*낮은/.test(q)) {
    let target: Asset | undefined;
    if (/btc|비트코인/.test(q)) target = assets.find((a) => a.ticker === "BTC-USD");
    else if (/spy|s&p|주식/.test(q)) target = assets.find((a) => a.ticker === "SPY");
    else if (/금|gld/.test(q)) target = assets.find((a) => a.ticker === "GLD");

    if (target) {
      const targetReturns = dailyReturns(target.data.slice(-252));
      const items = pool
        .filter((x) => x.asset.ticker !== target!.ticker)
        .map((x) => ({
          asset: x.asset,
          corr: correlation(dailyReturns(x.asset.data.slice(-252)), targetReturns),
        }))
        .sort((a, b) => direction === "desc" ? b.corr - a.corr : a.corr - b.corr)
        .slice(0, n);

      return {
        type: "list",
        interpretedQuery: `${target.ticker}와 상관관계가 가장 ${direction === "desc" ? "높은" : "낮은"} 자산 ${n}개`,
        items: items.map((x) => ({
          ticker: x.asset.ticker,
          name: x.asset.name,
          assetType: x.asset.assetType,
          value: x.corr,
          valueLabel: "상관계수",
        })),
      };
    }
  }

  // 패턴 2: 임계값 (변동성 30% 이상, 샤프 1 이상 등)
  const threshold = detectThreshold(query);
  if (threshold !== null) {
    const above = !/이하|미만|below|under|less/.test(q);
    let metric: keyof Pick<AssetWithMetrics, "volatility" | "return1Y" | "sharpe" | "mdd">;
    let label: string;
    if (/변동성|vol/.test(q)) { metric = "volatility"; label = "변동성"; }
    else if (/수익률|수익|return/.test(q)) { metric = "return1Y"; label = "1Y 수익률"; }
    else if (/낙폭|mdd/.test(q)) { metric = "mdd"; label = "MDD"; }
    else { metric = "sharpe"; label = "샤프"; }

    const items = pool
      .filter((x) => above ? x[metric] >= threshold : x[metric] <= threshold)
      .sort((a, b) => direction === "desc" ? b[metric] - a[metric] : a[metric] - b[metric])
      .slice(0, n);

    return {
      type: "list",
      interpretedQuery: `${types ? types.map((t) => ASSET_CLASS_LABELS[t]).join("/") + " 중 " : ""}${label} ${(threshold * 100).toFixed(0)}% ${above ? "이상" : "이하"}`,
      items: items.map((x) => ({
        ticker: x.asset.ticker,
        name: x.asset.name,
        assetType: x.asset.assetType,
        value: x[metric],
        valueLabel: label,
      })),
    };
  }

  // 패턴 3: 일반 정렬 (기본 = 수익률)
  let metric: keyof Pick<AssetWithMetrics, "volatility" | "return1Y" | "sharpe" | "mdd">;
  let label: string;
  if (/변동성|vol/.test(q)) { metric = "volatility"; label = "변동성"; }
  else if (/샤프|sharpe/.test(q)) { metric = "sharpe"; label = "샤프"; }
  else if (/낙폭|mdd|손실/.test(q)) { metric = "mdd"; label = "MDD"; }
  else { metric = "return1Y"; label = "1Y 수익률"; }

  const items = pool
    .sort((a, b) => direction === "desc" ? b[metric] - a[metric] : a[metric] - b[metric])
    .slice(0, n);

  if (items.length === 0) {
    return { type: "error", message: "조건에 맞는 자산이 없습니다" };
  }

  const filterDesc: string[] = [];
  if (types) filterDesc.push(types.map((t) => ASSET_CLASS_LABELS[t]).join("/"));
  if (/한국/.test(query)) filterDesc.push("한국");
  const interpretedQuery = `${filterDesc.join(" · ") || "전체"} 자산 중 ${label} ${direction === "desc" ? "TOP" : "BOTTOM"} ${n}`;

  return {
    type: "list",
    interpretedQuery,
    items: items.map((x) => ({
      ticker: x.asset.ticker,
      name: x.asset.name,
      assetType: x.asset.assetType,
      value: x[metric],
      valueLabel: label,
    })),
  };
}

export const EXAMPLE_QUERIES = [
  "기술주 중 변동성 가장 낮은 5개",
  "1년 수익률 톱10",
  "비트코인과 상관관계 가장 높은 자산",
  "변동성 30% 이상인 자산",
  "샤프 비율 1.5 이상",
  "한국 주식 톱5",
  "암호화폐 중 수익률 1위",
  "MDD 가장 작은 자산",
];
