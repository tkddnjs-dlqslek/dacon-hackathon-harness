"use client";

// visualization.md §1.1: 시계열 + 다중 종목 → Multi-line Chart
// 마우스 휠로 가로 확대/축소 + 색상 다중 fallback 매핑

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { useState, useRef, useEffect } from "react";
import type { AssetType } from "@/types";
import { SECTOR_COLORS, ASSET_CLASS_COLORS, ASSET_CLASS_LABELS } from "@/types";

interface Series {
  ticker: string;
  sector: string;       // 섹터명 또는 자산 클래스명 또는 자산 클래스 라벨
  color?: string;       // 직접 색상 지정 (있으면 우선)
  cumulativeReturns: number[];
}

interface Props {
  dates: string[];
  series: Series[];
  height?: number;
}

// 색상 결정: 명시 color → SECTOR_COLORS → 한국어 자산 클래스 라벨 매칭 → fallback 팔레트
const FALLBACK_PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#A855F7",
];

function resolveColor(s: Series, index: number): string {
  if (s.color) return s.color;
  if (SECTOR_COLORS[s.sector]) return SECTOR_COLORS[s.sector];

  // 한국어 자산 클래스 라벨 매칭 (예: "주식 / ETF" → ASSET_CLASS_COLORS.equity_etf)
  for (const type of Object.keys(ASSET_CLASS_LABELS) as AssetType[]) {
    if (ASSET_CLASS_LABELS[type] === s.sector) {
      return ASSET_CLASS_COLORS[type];
    }
  }

  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

export default function CumulativeReturnChart({ dates, series, height = 300 }: Props) {
  const total = dates.length;
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [start, end] = zoomRange ?? [0, total];

  const slicedDates = dates.slice(start, end);
  const slicedSeries = series.map((s, i) => ({
    ...s,
    color: resolveColor(s, i),
    cumulativeReturns: s.cumulativeReturns.slice(start, end),
  }));

  // Recharts용 데이터 변환
  const data = slicedDates.map((date, i) => {
    const point: Record<string, string | number> = { date };
    for (const s of slicedSeries) {
      point[s.ticker] = +(s.cumulativeReturns[i] * 100).toFixed(2);
    }
    return point;
  });

  // 네이티브 wheel 이벤트 (passive: false) — preventDefault로 페이지 스크롤 차단
  // 마우스 포인터 위치를 기준점으로 줌
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Recharts 플롯 영역 기준점 (YAxis width=50 + left margin=10, right margin=10)
    const PLOT_LEFT = 60;
    const PLOT_RIGHT = 10;

    const handleWheel = (e: WheelEvent) => {
      if (total < 30) return;
      e.preventDefault();
      e.stopPropagation();

      // 마우스 위치 → 플롯 영역 내 비율 (0~1)
      const rect = el.getBoundingClientRect();
      const plotWidth = Math.max(1, rect.width - PLOT_LEFT - PLOT_RIGHT);
      const mouseX = e.clientX - rect.left - PLOT_LEFT;
      const mouseRatio = Math.max(0, Math.min(1, mouseX / plotWidth));

      setZoomRange((prev) => {
        const [s, en] = prev ?? [0, total];
        const visible = en - s;
        // 마우스가 가리키는 데이터 인덱스 (소수 포함)
        const anchorIdx = s + mouseRatio * visible;

        let newVisible: number;
        if (e.deltaY < 0) {
          // 줌 인 (확대)
          newVisible = Math.max(20, Math.floor(visible * 0.8));
        } else {
          // 줌 아웃 (축소)
          newVisible = Math.floor(visible * 1.25);
          if (newVisible >= total) return null;
        }

        // 마우스 위치의 데이터 인덱스가 그대로 유지되도록 새 start 계산
        // newStart + mouseRatio * newVisible = anchorIdx
        let newStart = Math.round(anchorIdx - mouseRatio * newVisible);
        newStart = Math.max(0, Math.min(total - newVisible, newStart));
        const newEnd = newStart + newVisible;
        return [newStart, newEnd];
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [total]);

  // X축 라벨 간격
  const tickInterval = Math.max(1, Math.floor(slicedDates.length / 12));
  const isZoomed = zoomRange !== null;
  const zoomPercent = isZoomed ? Math.round((slicedDates.length / total) * 100) : 100;

  return (
    <div className="relative" ref={containerRef}>
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        {isZoomed && (
          <>
            <span className="rounded bg-gray-800/80 px-2 py-1 text-xs text-gray-300">
              {zoomPercent}% · {slicedDates[0]} ~ {slicedDates[slicedDates.length - 1]}
            </span>
            <button
              onClick={() => setZoomRange(null)}
              className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              🔍 전체 보기
            </button>
          </>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            interval={tickInterval}
            tickFormatter={(d: string) => d.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickFormatter={(v: number) => `${v}%`}
            width={50}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
            labelStyle={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}
            itemStyle={{ fontSize: 11, padding: "2px 0" }}
            formatter={(value, name) => {
              const v = Number(value);
              const sign = v >= 0 ? "+" : "";
              return [`${sign}${v.toFixed(2)}%`, name];
            }}
            labelFormatter={(label) => `📅 ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {slicedSeries.map((s) => (
            <Line
              key={s.ticker}
              type="monotone"
              dataKey={s.ticker}
              stroke={s.color}
              dot={false}
              strokeWidth={1.5}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-1 text-center text-xs text-gray-600">
        💡 마우스 휠로 가로 확대/축소
      </p>
    </div>
  );
}
