"use client";

// 포트폴리오 비중 조정 + 백테스트 + 리밸런싱 — 인터랙티브 클라이언트 컴포넌트

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DualLineChart } from "@/components/charts";
import type { OHLCV } from "@/types";
import { SECTOR_COLORS } from "@/types";

// ETF 티커 → 섹터 매핑 (SECTOR_COLORS 키와 일치해야 함)
const ETF_SECTOR: Record<string, string> = {
  XLK: "Technology", XLE: "Energy", XLV: "Healthcare", XLF: "Financials",
  XLY: "Consumer Disc.", XLI: "Industrials", XLRE: "Real Estate",
  XLU: "Utilities", XLP: "Consumer Staples", XLB: "Materials", XLC: "Communication",
  QQQ: "Technology", DIA: "Benchmark", IWM: "Benchmark", VTI: "Benchmark", SPY: "Benchmark",
};

// 섹터 한국어 표시명
const SECTOR_KO: Record<string, string> = {
  Technology: "기술", Energy: "에너지", Healthcare: "헬스케어", Financials: "금융",
  "Consumer Disc.": "임의소비재", Industrials: "산업재", "Real Estate": "부동산",
  Utilities: "유틸리티", "Consumer Staples": "필수소비재", Materials: "소재",
  Communication: "통신", Benchmark: "벤치마크",
};

interface ETFInput {
  ticker: string;
  sector: string;
  data: OHLCV[];
}

interface Props {
  etfs: ETFInput[];
  spyData: OHLCV[];
  riskFreeRate: number;
}

const RB_OPTIONS = [
  { label: "없음", days: 0 },
  { label: "월간", days: 21 },
  { label: "분기", days: 63 },
  { label: "반기", days: 126 },
  { label: "연간", days: 252 },
];

// URL ↔ 비중 인코딩
function encodeWeights(weights: number[]): string {
  return weights.map((w) => Math.round(w * 1000)).join(",");
}
function decodeWeights(s: string, n: number): number[] | null {
  const parts = s.split(",").map(Number);
  if (parts.length !== n || parts.some(isNaN)) return null;
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum === 0) return null;
  return parts.map((p) => p / sum); // 정규화
}

export default function PortfolioBuilder({ etfs, spyData, riskFreeRate }: Props) {
  const n = etfs.length;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL에서 비중 복원 (있으면 사용, 없으면 균등 배분)
  const initialWeights = useMemo(() => {
    const w = searchParams.get("w");
    if (w) {
      const decoded = decodeWeights(w, n);
      if (decoded) return decoded;
    }
    return Array(n).fill(1 / n);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialRb = useMemo(() => {
    const rb = searchParams.get("rb");
    return rb ? Math.max(0, Math.min(4, Number(rb))) : 2;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [weights, setWeights] = useState<number[]>(initialWeights);
  const [rbIndex, setRbIndex] = useState(initialRb);
  const [shareToast, setShareToast] = useState(false);

  // 비중 변경 시 URL 업데이트 (replaceState — 히스토리 안 쌓음)
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("w", encodeWeights(weights));
    params.set("rb", String(rbIndex));
    window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
  }, [weights, rbIndex, pathname]);

  const handleShare = async () => {
    const params = new URLSearchParams();
    params.set("w", encodeWeights(weights));
    params.set("rb", String(rbIndex));
    const url = `${window.location.origin}${pathname}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    } catch {
      window.prompt("아래 URL을 복사하세요", url);
    }
  };

  const setWeight = (idx: number, val: number) => {
    const newW = [...weights];
    newW[idx] = val;
    // 나머지 비례 조정 (합계 1 유지)
    const othersSum = newW.reduce((s, w, i) => (i === idx ? s : s + w), 0);
    const remaining = 1 - val;
    if (othersSum > 0) {
      for (let i = 0; i < n; i++) {
        if (i !== idx) newW[i] = (newW[i] / othersSum) * remaining;
      }
    }
    setWeights(newW);
  };

  const equalWeight = () => setWeights(Array(n).fill(1 / n));

  // 백테스트 시뮬레이션
  const simulation = useMemo(() => {
    const len = Math.min(...etfs.map((e) => e.data.length), spyData.length);
    const rbDays = RB_OPTIONS[rbIndex].days;

    // 포트폴리오 가치 계산
    const init = 10000;
    let shares = weights.map((w, i) => (w * init) / etfs[i].data[0].close);
    const portfolioValues: number[] = [];
    const spyValues: number[] = [];
    const dates: string[] = [];
    let daysSinceRb = 0;

    // 리밸런싱 시뮬
    let rbShares = [...shares];
    const rebalancedValues: number[] = [];
    const buyHoldValues: number[] = [];

    const spyShares = init / spyData[0].close;

    for (let d = 0; d < len; d++) {
      dates.push(etfs[0].data[d].date);

      // 바이앤홀드
      const bhVal = shares.reduce((s, sh, i) => s + sh * etfs[i].data[d].close, 0);
      buyHoldValues.push(bhVal);

      // 리밸런싱
      const rbVal = rbShares.reduce((s, sh, i) => s + sh * etfs[i].data[d].close, 0);
      rebalancedValues.push(rbVal);

      // SPY
      spyValues.push(spyShares * spyData[d].close);

      daysSinceRb++;
      if (rbDays > 0 && daysSinceRb >= rbDays && d < len - 1) {
        rbShares = weights.map((w, i) => (w * rbVal) / etfs[i].data[d].close);
        daysSinceRb = 0;
      }
    }

    // 지표 계산
    const finalRb = rebalancedValues[rebalancedValues.length - 1];
    const totalReturn = finalRb / init - 1;
    const annReturn = Math.pow(1 + totalReturn, 252 / len) - 1;

    // 일간 수익률 → 변동성
    const dailyRets: number[] = [];
    for (let i = 1; i < rebalancedValues.length; i++) {
      dailyRets.push(rebalancedValues[i] / rebalancedValues[i - 1] - 1);
    }
    const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length;
    const variance = dailyRets.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyRets.length - 1);
    const vol = Math.sqrt(variance) * Math.sqrt(252);
    const sharpe = vol === 0 ? 0 : (annReturn - riskFreeRate) / vol;

    // MDD
    let peak = rebalancedValues[0];
    let mdd = 0;
    for (const v of rebalancedValues) {
      if (v > peak) peak = v;
      const dd = (v - peak) / peak;
      if (dd < mdd) mdd = dd;
    }

    return { dates, rebalancedValues, buyHoldValues, spyValues, annReturn, vol, sharpe, mdd };
  }, [weights, rbIndex, etfs, spyData, riskFreeRate]);

  return (
    <div className="space-y-6">
      {/* A. 비중 조정 슬라이더 */}
      <section className="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">ETF 비중</h2>
          <div className="flex gap-2">
            <button onClick={equalWeight} className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:text-gray-900">
              균등 배분
            </button>
            <button onClick={handleShare} className="rounded bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-700">
              🔗 링크 공유
            </button>
          </div>
        </div>
        {shareToast && (
          <div className="absolute right-4 top-12 z-10 rounded bg-green-600 px-3 py-1 text-xs text-white shadow-lg">
            URL이 클립보드에 복사되었습니다
          </div>
        )}
        <div className="space-y-2">
          {etfs.map((etf, i) => {
            const sectorKey = ETF_SECTOR[etf.ticker] ?? etf.sector;
            const sliderColor = SECTOR_COLORS[sectorKey] ?? "#94A3B8";
            const pct = Math.round(weights[i] * 100);
            return (
            <div key={etf.ticker} className="flex items-center gap-3">
              <div className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: sliderColor }} />
              <div className="w-28 shrink-0">
                <span className="block text-sm font-mono font-bold">{etf.ticker}</span>
                <span className="block text-[10px] text-gray-400 truncate">{SECTOR_KO[sectorKey] ?? sectorKey}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => setWeight(i, Number(e.target.value) / 100)}
                className="min-w-0 flex-1"
                style={{
                  "--slider-fill": sliderColor,
                  "--slider-pct": `${pct}%`,
                  accentColor: sliderColor,
                  color: sliderColor,
                } as React.CSSProperties}
              />
              <span className="w-10 shrink-0 text-right text-sm font-mono">{pct}%</span>
            </div>
          );
          })}
        </div>
      </section>

      {/* B. 백테스트 + C. KPI */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-3 font-semibold">포트폴리오 vs S&P 500</h2>
          <DualLineChart
            dates={simulation.dates}
            seriesA={simulation.rebalancedValues}
            seriesB={simulation.spyValues}
            labelA="포트폴리오"
            labelB="SPY (S&P 500)"
          />
        </section>
        <section className="grid grid-cols-2 gap-3">
          {[
            { label: "연환산 수익률", value: `${(simulation.annReturn * 100).toFixed(1)}%`, positive: simulation.annReturn >= 0 },
            { label: "변동성", value: `${(simulation.vol * 100).toFixed(1)}%` },
            { label: "샤프", value: simulation.sharpe.toFixed(2), positive: simulation.sharpe > 1 },
            { label: "최대 낙폭", value: `${(simulation.mdd * 100).toFixed(1)}%` },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold ${kpi.positive ? "text-green-400" : kpi.value.startsWith("-") ? "text-red-400" : "text-gray-900"}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </section>
      </div>

      {/* D. 리밸런싱 비교 */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">리밸런싱 비교</h2>
          <div className="flex gap-1">
            {RB_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setRbIndex(i)}
                className={`rounded px-2 py-1 text-xs ${i === rbIndex ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <DualLineChart
          dates={simulation.dates}
          seriesA={simulation.rebalancedValues}
          seriesB={simulation.buyHoldValues}
          labelA="리밸런싱"
          labelB="바이앤홀드"
        />
      </section>
    </div>
  );
}
