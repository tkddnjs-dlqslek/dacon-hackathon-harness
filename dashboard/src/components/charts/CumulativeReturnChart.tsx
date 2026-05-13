"use client";

// visualization.md 1.1: 시계열 + 다중 종목 → Multi-line Chart
// 휠 줌 + 드래그 패닝 + 라인 하이라이트(C-3) + 더블클릭 라우팅(C-1) + Brush(C3)
// + 컬러블라인드 친화 팔레트 (Okabe-Ito 8색)

import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Brush,
} from "recharts";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AssetType } from "@/types";
import { SECTOR_COLORS, ASSET_CLASS_COLORS, ASSET_CLASS_LABELS } from "@/types";

interface Series {
  ticker: string;
  sector: string;
  color?: string;
  cumulativeReturns: number[];
  assetType?: AssetType;   // C-1 라우팅용
}

interface Props {
  dates: string[];
  series: Series[];
  height?: number;
  showBrush?: boolean;       // C3 — 브러시 줌 미니맵
  enableRouting?: boolean;   // C-1 — 더블클릭 시 자산 클래스 페이지로 이동
}

// 컬러블라인드 친화 (Okabe-Ito 8색) + 기본 팔레트 폴백
const COLORBLIND_PALETTE = [
  "#0072B2", // 파랑
  "#E69F00", // 호박
  "#009E73", // 청록
  "#D55E00", // 주홍
  "#CC79A7", // 핑크
  "#56B4E9", // 하늘
  "#F0E442", // 노랑
  "#000000", // 검정
];

const TYPE_TO_SLUG: Partial<Record<AssetType, string>> = {
  equity_etf: "stocks",
  bond: "bonds",
  fx: "fx",
  commodity: "commodities",
  crypto: "crypto",
  index: "indices",
};

function resolveColor(s: Series, index: number): string {
  if (s.color) return s.color;
  if (SECTOR_COLORS[s.sector]) return SECTOR_COLORS[s.sector];
  for (const type of Object.keys(ASSET_CLASS_LABELS) as AssetType[]) {
    if (ASSET_CLASS_LABELS[type] === s.sector) {
      return ASSET_CLASS_COLORS[type];
    }
  }
  return COLORBLIND_PALETTE[index % COLORBLIND_PALETTE.length];
}

export default function CumulativeReturnChart({
  dates, series, height = 300, showBrush = false, enableRouting = false,
}: Props) {
  const total = dates.length;
  const router = useRouter();
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const [highlightedTicker, setHighlightedTicker] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 드래그 패닝 상태
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startRange: [number, number] | null;
    moved: boolean;
  }>({ isDragging: false, startX: 0, startRange: null, moved: false });

  const [start, end] = zoomRange ?? [0, total];

  const slicedDates = dates.slice(start, end);
  const slicedSeries = series.map((s, i) => ({
    ...s,
    color: resolveColor(s, i),
    cumulativeReturns: s.cumulativeReturns.slice(start, end),
  }));

  const data = slicedDates.map((date, i) => {
    const point: Record<string, string | number> = { date };
    for (const s of slicedSeries) {
      point[s.ticker] = +(s.cumulativeReturns[i] * 100).toFixed(2);
    }
    return point;
  });

  // ── 휠 줌 + 드래그 패닝 ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (total < 30) return;
      e.preventDefault();
      e.stopPropagation();

      const grid = el.querySelector(".recharts-cartesian-grid") as SVGGElement | null;
      let plotLeft: number, plotWidth: number;
      if (grid) {
        const r = grid.getBoundingClientRect();
        plotLeft = r.left;
        plotWidth = r.width;
      } else {
        const r = el.getBoundingClientRect();
        plotLeft = r.left + 60;
        plotWidth = Math.max(1, r.width - 70);
      }

      const mouseX = e.clientX - plotLeft;
      const mouseRatio = Math.max(0, Math.min(1, mouseX / plotWidth));

      setZoomRange((prev) => {
        const [s, en] = prev ?? [0, total];
        const visible = en - s;
        const anchorIdx = s + mouseRatio * visible;

        let newVisible: number;
        if (e.deltaY < 0) newVisible = Math.max(20, Math.floor(visible * 0.8));
        else {
          newVisible = Math.floor(visible * 1.25);
          if (newVisible >= total) return null;
        }

        let newStartFloat = anchorIdx - mouseRatio * newVisible;
        newStartFloat = Math.max(0, Math.min(total - newVisible, newStartFloat));
        const newStart = Math.round(newStartFloat);
        return [newStart, newStart + newVisible];
      });
    };

    // 드래그 패닝
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragStateRef.current = {
        isDragging: true,
        startX: e.clientX,
        startRange: zoomRange ?? [0, total],
        moved: false,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds.isDragging || !ds.startRange) return;
      const dx = e.clientX - ds.startX;
      if (Math.abs(dx) < 5) return; // 클릭과 드래그 구분 임계
      ds.moved = true;
      const grid = el.querySelector(".recharts-cartesian-grid") as SVGGElement | null;
      const plotWidth = grid ? grid.getBoundingClientRect().width : el.clientWidth - 70;
      const [s0, e0] = ds.startRange;
      const visible = e0 - s0;
      const shift = -Math.round((dx / plotWidth) * visible);
      const newStart = Math.max(0, Math.min(total - visible, s0 + shift));
      setZoomRange([newStart, newStart + visible]);
    };

    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [total, zoomRange]);

  // 라인 클릭 핸들러 — 하이라이트 토글 (드래그 중 아닐 때만)
  const handleLineClick = (ticker: string) => {
    if (dragStateRef.current.moved) return;
    setHighlightedTicker((prev) => (prev === ticker ? null : ticker));
  };

  // 라인 더블클릭 — 자산 클래스 페이지로 라우팅 (enableRouting=true 시)
  const handleLineDoubleClick = (s: Series) => {
    if (!enableRouting) return;
    const slug = s.assetType ? TYPE_TO_SLUG[s.assetType] : undefined;
    if (slug) router.push(`/asset-class/${slug}`);
  };

  const tickInterval = Math.max(1, Math.floor(slicedDates.length / 12));
  const isZoomed = zoomRange !== null;
  const zoomPercent = isZoomed ? Math.round((slicedDates.length / total) * 100) : 100;

  return (
    <div className="relative select-none" ref={containerRef} style={{ cursor: dragStateRef.current.isDragging ? "grabbing" : "default" }}>
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        {highlightedTicker && (
          <span className="rounded px-2 py-1 text-xs font-mono" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}>
            🎯 {highlightedTicker} 하이라이트 (클릭 해제)
          </span>
        )}
        {isZoomed && (
          <>
            <span className="rounded px-2 py-1 text-xs" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
              {zoomPercent}% · {slicedDates[0]} ~ {slicedDates[slicedDates.length - 1]}
            </span>
            <button
              onClick={() => setZoomRange(null)}
              className="rounded px-2 py-1 text-xs"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              🔍 전체 보기
            </button>
          </>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: showBrush ? 5 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            interval={tickInterval}
            tickFormatter={(d: string) => d.slice(5)}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickFormatter={(v: number) => `${v}%`}
            width={50}
            stroke="var(--border)"
          />
          {/* C1 0% 기준선 — 영역 시각적 분리 */}
          <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="2 2" strokeWidth={1} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              boxShadow: "var(--shadow-md)",
              color: "var(--text-primary)",
            }}
            labelStyle={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 4 }}
            itemStyle={{ fontSize: 11, padding: "2px 0", fontFamily: "var(--font-mono)" }}
            cursor={{ stroke: "var(--chart-crosshair)", strokeWidth: 1, strokeDasharray: "3 3" }}
            formatter={(value, name) => {
              const v = Number(value);
              const sign = v >= 0 ? "+" : "";
              return [`${sign}${v.toFixed(2)}%`, name];
            }}
            labelFormatter={(label) => `📅 ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            onClick={(o) => {
              const dk = (o as { dataKey?: string }).dataKey;
              if (typeof dk === "string") handleLineClick(dk);
            }}
          />
          {slicedSeries.map((s) => {
            const faded = highlightedTicker != null && highlightedTicker !== s.ticker;
            const highlighted = highlightedTicker === s.ticker;
            return (
              <Line
                key={s.ticker}
                type="monotone"
                dataKey={s.ticker}
                stroke={s.color}
                dot={false}
                strokeWidth={highlighted ? 2.6 : 1.5}
                strokeOpacity={faded ? 0.2 : 1}
                onClick={() => handleLineClick(s.ticker)}
                onDoubleClick={() => handleLineDoubleClick(s)}
                style={{ cursor: "pointer" }}
                isAnimationActive={false}
              />
            );
          })}
          {showBrush && total > 60 && (
            <Brush
              dataKey="date"
              height={24}
              stroke="var(--accent)"
              fill="var(--bg-elevated)"
              tickFormatter={(d: string) => d.slice(5)}
              travellerWidth={8}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        💡 휠=확대/축소 · 드래그=좌우 이동 · 라인/범례 클릭=하이라이트
        {enableRouting ? " · 라인 더블클릭=자산 클래스 상세" : ""}
      </p>
    </div>
  );
}
