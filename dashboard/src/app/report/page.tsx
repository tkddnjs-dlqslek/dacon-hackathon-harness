// 자동 인사이트 리포트 — "지난 1년 시장 요약 보고서"

import { loadAllAssets, loadUniverse } from "@/lib/load-server-data";
import PrintButton from "@/components/ui/PrintButton";
import { dailyReturns, correlation, volatility, maxDrawdown } from "@/lib/analysis-engine";
import type { Asset, AssetType } from "@/types";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/types";

function calc(asset: Asset) {
  const data = asset.data.slice(-252);
  if (data.length < 2) return null;
  const ret = data[data.length - 1].close / data[0].close - 1;
  const vol = volatility(data);
  const mdd = maxDrawdown(data);
  return { ret, vol, mdd };
}

export default async function ReportPage() {
  const [assets, universe] = await Promise.all([
    loadAllAssets(),
    loadUniverse(),
  ]);

  // 자산 클래스별 평균 수익률
  const classStats: { type: AssetType; label: string; avgRet: number; count: number; best: { ticker: string; ret: number } | null }[] = [];
  const ASSET_TYPES: AssetType[] = ["equity_etf", "bond", "fx", "commodity", "crypto", "index"];

  for (const t of ASSET_TYPES) {
    const ofType = assets.filter((a) => a.assetType === t);
    if (ofType.length === 0) continue;
    const metrics = ofType.map((a) => ({ asset: a, m: calc(a) })).filter((x) => x.m);
    const avgRet = metrics.reduce((s, x) => s + (x.m?.ret ?? 0), 0) / metrics.length;
    const best = metrics.sort((a, b) => (b.m?.ret ?? 0) - (a.m?.ret ?? 0))[0];
    classStats.push({
      type: t,
      label: ASSET_CLASS_LABELS[t],
      avgRet,
      count: ofType.length,
      best: best ? { ticker: best.asset.ticker, ret: best.m?.ret ?? 0 } : null,
    });
  }

  classStats.sort((a, b) => b.avgRet - a.avgRet);

  // 자산별 톱5
  const allWithMetrics = assets.map((a) => ({ asset: a, m: calc(a) })).filter((x) => x.m);
  const topGainers = [...allWithMetrics].sort((a, b) => (b.m?.ret ?? 0) - (a.m?.ret ?? 0)).slice(0, 5);
  const topLosers = [...allWithMetrics].sort((a, b) => (a.m?.ret ?? 0) - (b.m?.ret ?? 0)).slice(0, 5);

  // 위험 자산
  const highVol = [...allWithMetrics].sort((a, b) => (b.m?.vol ?? 0) - (a.m?.vol ?? 0)).slice(0, 3);
  const safeAssets = [...allWithMetrics].sort((a, b) => (a.m?.vol ?? 0) - (b.m?.vol ?? 0)).slice(0, 3);

  // 크로스 에셋 상관 (주식-채권, 주식-금, 주식-비트코인)
  const spy = assets.find((a) => a.ticker === "SPY");
  const tnx = assets.find((a) => a.ticker === "^TNX");
  const gld = assets.find((a) => a.ticker === "GLD");
  const btc = assets.find((a) => a.ticker === "BTC-USD");

  const corrs: { pair: string; value: number; interpretation: string }[] = [];
  if (spy && tnx) {
    const c = correlation(dailyReturns(spy.data.slice(-63)), dailyReturns(tnx.data.slice(-63)));
    corrs.push({
      pair: "주식 (SPY) ↔ 10년 국채금리 (^TNX)",
      value: c,
      interpretation: c > 0.3 ? "전통적 분산 효과 약화 — 금리 상승이 주식에 부담" : c < -0.3 ? "전통적 음의 상관 회복" : "중립",
    });
  }
  if (spy && gld) {
    const c = correlation(dailyReturns(spy.data.slice(-63)), dailyReturns(gld.data.slice(-63)));
    corrs.push({
      pair: "주식 (SPY) ↔ 금 (GLD)",
      value: c,
      interpretation: c < 0 ? "금이 헤지 자산 역할" : "동조화 — 헤지 효과 약함",
    });
  }
  if (spy && btc) {
    const c = correlation(dailyReturns(spy.data.slice(-63)), dailyReturns(btc.data.slice(-63)));
    corrs.push({
      pair: "주식 (SPY) ↔ 비트코인 (BTC-USD)",
      value: c,
      interpretation: c > 0.5 ? "분산 효과 제한적 — 위험 자산 동조화" : "독립적 움직임",
    });
  }

  // 레짐 판단
  const stockRet = spy ? calc(spy)?.ret ?? 0 : 0;
  const goldRet = gld ? calc(gld)?.ret ?? 0 : 0;
  const tnxChange = tnx && tnx.data.length >= 2
    ? tnx.data[tnx.data.length - 1].close - tnx.data[Math.max(0, tnx.data.length - 252)].close
    : 0;

  let regime = "중립";
  let regimeColor = "text-gray-300";
  let regimeDesc = "";
  if (stockRet > 0.1 && goldRet < 0.05 && tnxChange > 0) {
    regime = "리스크 온 (Risk-On)";
    regimeColor = "text-green-400";
    regimeDesc = "위험 자산 선호. 주식·비트코인 등 성장 자산에 자금이 유입되는 환경입니다.";
  } else if (stockRet < 0 && goldRet > 0.05) {
    regime = "리스크 오프 (Risk-Off)";
    regimeColor = "text-yellow-400";
    regimeDesc = "안전 자산 수요 증가. 금·국채 등 방어 자산이 강세를 보이는 환경입니다.";
  } else {
    regime = "전환 국면";
    regimeColor = "text-blue-400";
    regimeDesc = "명확한 방향성이 없는 중립 국면입니다. 자산 배분의 균형 유지를 권장합니다.";
  }

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      {/* 헤더 */}
      <header className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">시장 요약 리포트</h1>
            <p className="mt-1 text-sm text-gray-400">
              지난 1년 자동 분석 보고서 · 발행일: {today}
            </p>
          </div>
          <PrintButton />
        </div>
      </header>

      {/* 시장 레짐 */}
      <section className="rounded-lg border-2 border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">시장 레짐 판단</h2>
        <p className={`text-3xl font-bold ${regimeColor}`}>{regime}</p>
        <p className="mt-2 text-sm text-gray-400">{regimeDesc}</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-gray-500">주식 1년 수익률</span>
            <p className={`font-mono text-lg ${stockRet >= 0 ? "text-green-400" : "text-red-400"}`}>
              {(stockRet * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-gray-500">금 1년 수익률</span>
            <p className={`font-mono text-lg ${goldRet >= 0 ? "text-green-400" : "text-red-400"}`}>
              {(goldRet * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-gray-500">10Y 금리 변화</span>
            <p className={`font-mono text-lg ${tnxChange >= 0 ? "text-yellow-400" : "text-blue-400"}`}>
              {tnxChange >= 0 ? "+" : ""}{(tnxChange * 100).toFixed(0)} bps
            </p>
          </div>
        </div>
      </section>

      {/* 자산 클래스 성과 랭킹 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">자산 클래스별 성과 (1년)</h2>
        <div className="space-y-3">
          {classStats.map((c, i) => (
            <div key={c.type} className="flex items-center gap-3">
              <span className="w-6 text-center text-xs text-gray-500">{i + 1}위</span>
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: ASSET_CLASS_COLORS[c.type] }} />
              <span className="w-32 text-sm">{c.label}</span>
              <div className="flex-1">
                <div className={`h-5 rounded ${c.avgRet >= 0 ? "bg-green-600" : "bg-red-600"}`}
                  style={{ width: `${Math.min(Math.abs(c.avgRet * 100) * 2, 100)}%` }} />
              </div>
              <span className={`w-16 text-right font-mono text-sm ${c.avgRet >= 0 ? "text-green-400" : "text-red-400"}`}>
                {(c.avgRet * 100).toFixed(1)}%
              </span>
              {c.best && (
                <span className="w-32 text-xs text-gray-500">
                  베스트: <span className="font-mono text-gray-300">{c.best.ticker}</span> ({(c.best.ret * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 톱 무버 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-green-900/40 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-green-400">📈 TOP 5 상승</h2>
          <div className="space-y-2">
            {topGainers.map((x, i) => (
              <div key={x.asset.ticker} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{i + 1}.</span>
                <span className="font-mono font-bold flex-1 ml-2">{x.asset.ticker}</span>
                <span className="text-xs text-gray-400 mr-2">{x.asset.name.slice(0, 20)}</span>
                <span className="font-mono text-green-400">+{((x.m?.ret ?? 0) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-red-900/40 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-red-400">📉 TOP 5 하락</h2>
          <div className="space-y-2">
            {topLosers.map((x, i) => (
              <div key={x.asset.ticker} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{i + 1}.</span>
                <span className="font-mono font-bold flex-1 ml-2">{x.asset.ticker}</span>
                <span className="text-xs text-gray-400 mr-2">{x.asset.name.slice(0, 20)}</span>
                <span className="font-mono text-red-400">{((x.m?.ret ?? 0) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 위험·안전 자산 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-yellow-900/40 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-yellow-400">⚠ 변동성 최고</h2>
          <div className="space-y-2">
            {highVol.map((x) => (
              <div key={x.asset.ticker} className="flex items-center justify-between text-sm">
                <span className="font-mono font-bold">{x.asset.ticker}</span>
                <span className="text-xs text-gray-400 flex-1 ml-2">{x.asset.name.slice(0, 25)}</span>
                <span className="font-mono text-yellow-400">σ {((x.m?.vol ?? 0) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-cyan-900/40 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-cyan-400">🛡 변동성 최저 (안정)</h2>
          <div className="space-y-2">
            {safeAssets.map((x) => (
              <div key={x.asset.ticker} className="flex items-center justify-between text-sm">
                <span className="font-mono font-bold">{x.asset.ticker}</span>
                <span className="text-xs text-gray-400 flex-1 ml-2">{x.asset.name.slice(0, 25)}</span>
                <span className="font-mono text-cyan-400">σ {((x.m?.vol ?? 0) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 크로스 에셋 상관관계 */}
      <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">크로스 에셋 상관관계 (최근 3개월)</h2>
        <div className="space-y-3">
          {corrs.map((c, i) => (
            <div key={i} className="rounded border border-gray-800 bg-gray-950 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{c.pair}</span>
                <span className={`font-mono text-lg ${Math.abs(c.value) > 0.5 ? "text-orange-400" : "text-gray-300"}`}>
                  {c.value.toFixed(2)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{c.interpretation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 풋터 */}
      <footer className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-center text-xs text-gray-500">
        본 리포트는 yfinance 데이터를 기반으로 자동 생성되었습니다 · 총 분석 자산: {assets.length}개 + S&P 500 유니버스 {universe.length}개
      </footer>
    </div>
  );
}
