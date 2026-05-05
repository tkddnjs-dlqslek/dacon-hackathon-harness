// 룰 기반 시장 시황 분석 엔진
// data-analysis.md 8절 (매크로 신호) + insight-generation.md 6절·7절 규칙을
// 클라이언트 사이드에서 실행해 LLM 의존 없이 동일 형식의 분석 결과 생성
//
// 외부 API 키 불필요 — 100% 결정론적·즉시 응답

import { ASSET_CLASS_LABELS } from "@/types";
import type { AssetType } from "@/types";

export interface MarketSignals {
  vix?: number;
  yieldCurveSlope?: number;
  topGainers: { ticker: string; ret: number; assetType: string }[];
  topLosers: { ticker: string; ret: number; assetType: string }[];
  period: string;
}

export interface MarketSummary {
  regime: "리스크 온" | "중립" | "리스크 오프";
  summary: string;
  watchlist: string[];
  risks: string[];
}

const ASSET_LABEL = (t: string): string => {
  return ASSET_CLASS_LABELS[t as AssetType] ?? t;
};

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

// 시황 판단 룰 (data-analysis 8절 시그널)
function classifyRegime(s: MarketSignals): MarketSummary["regime"] {
  const vixDanger = s.vix != null && s.vix > 25;
  const yieldInverted = s.yieldCurveSlope != null && s.yieldCurveSlope < 0;
  const yieldFlat = s.yieldCurveSlope != null && s.yieldCurveSlope < 0.5;

  if (vixDanger || yieldInverted) return "리스크 오프";

  const vixCalm = s.vix != null && s.vix < 15;
  const equityCryptoUp = s.topGainers.filter(
    (g) => g.assetType === "equity_etf" || g.assetType === "crypto"
  ).length;

  if (vixCalm && equityCryptoUp >= 2 && !yieldFlat) return "리스크 온";
  return "중립";
}

function buildSummaryText(s: MarketSignals, regime: MarketSummary["regime"]): string {
  const parts: string[] = [];

  if (s.vix != null) {
    const tag =
      s.vix < 15 ? "안정" : s.vix < 25 ? "보통" : s.vix < 35 ? "불안" : "공포";
    parts.push(`VIX ${s.vix.toFixed(1)}(${tag})`);
  }

  if (s.yieldCurveSlope != null) {
    const slope = s.yieldCurveSlope.toFixed(2);
    const tag =
      s.yieldCurveSlope < 0
        ? "역전"
        : s.yieldCurveSlope < 0.5
          ? "플래트닝"
          : "정상";
    parts.push(`일드커브 ${slope}%p(${tag})`);
  }

  if (s.topGainers.length > 0) {
    const lead = s.topGainers[0];
    parts.push(`상승 선두 ${lead.ticker} ${fmtPct(lead.ret)}`);
  }

  const regimeMsg: Record<MarketSummary["regime"], string> = {
    "리스크 온": "위험 자산 선호 환경 — 주식·암호화폐 모멘텀 활용 가능",
    "중립": "방향성 불명확 — 자산 클래스 분산 유지 권장",
    "리스크 오프": "안전 자산 선호 환경 — 채권·금 비중 점검 필요",
  };

  return `${parts.join(" · ")}. ${regimeMsg[regime]}.`;
}

function buildWatchlist(s: MarketSignals): string[] {
  const list = s.topGainers.slice(0, 3).map((g) => {
    return `${ASSET_LABEL(g.assetType)} ${g.ticker} ${fmtPct(g.ret)} — 모멘텀 지속 점검`;
  });
  return list;
}

function buildRisks(s: MarketSignals): string[] {
  const risks: string[] = [];

  if (s.vix != null && s.vix > 35) {
    risks.push(`VIX ${s.vix.toFixed(1)} 공포 구간 — 손절·레버리지 점검 필요`);
  } else if (s.vix != null && s.vix > 25) {
    risks.push(`VIX ${s.vix.toFixed(1)} 불안 — 변동성 확대 가능성`);
  }

  if (s.yieldCurveSlope != null && s.yieldCurveSlope < 0) {
    risks.push(
      `장단기 금리 ${s.yieldCurveSlope.toFixed(2)}%p 역전 — 역사적 침체 선행 신호`
    );
  } else if (s.yieldCurveSlope != null && s.yieldCurveSlope < 0.5) {
    risks.push(
      `일드커브 플래트닝(${s.yieldCurveSlope.toFixed(2)}%p) — 경기 둔화 우려`
    );
  }

  if (s.topLosers.length > 0) {
    const worst = s.topLosers[0];
    if (worst.ret < -0.1) {
      risks.push(
        `${ASSET_LABEL(worst.assetType)} ${worst.ticker} ${fmtPct(worst.ret)} — 자산 클래스 동조 하락 점검`
      );
    }
  }

  if (risks.length === 0) {
    risks.push("뚜렷한 거시 위험 신호 없음 — 평소 분산 유지");
  }

  return risks.slice(0, 2);
}

export function generateMarketSummary(signals: MarketSignals): MarketSummary {
  const regime = classifyRegime(signals);
  return {
    regime,
    summary: buildSummaryText(signals, regime),
    watchlist: buildWatchlist(signals),
    risks: buildRisks(signals),
  };
}
