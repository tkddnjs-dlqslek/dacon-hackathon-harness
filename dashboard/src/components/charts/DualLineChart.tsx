"use client";

// visualization.md 1.1: A vs B 시계열 → Dual Line Chart
// 휠 줌 + 드래그 패닝 + 테마 호환 + crosshair

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { useState, useRef, useEffect } from "react";

interface Props {
  dates: string[];
  seriesA: number[];
  seriesB: number[];
  labelA?: string;
  labelB?: string;
}

export default function DualLineChart({
  dates,
  seriesA,
  seriesB,
  labelA = "ETF",
  labelB = "Direct",
}: Props) {
  const total = dates.length;
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startRange: [number, number] | null }>({
    active: false, startX: 0, startRange: null,
  });

  const [start, end] = zoomRange ?? [0, total];
  const slicedDates = dates.slice(start, end);
  const slicedA = seriesA.slice(start, end);
  const slicedB = seriesB.slice(start, end);

  const data = slicedDates.map((date, i) => ({
    date,
    [labelA]: +slicedA[i].toFixed(0),
    [labelB]: +slicedB[i].toFixed(0),
  }));

  // 휠 줌 + 드래그 패닝
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
      const mouseRatio = Math.max(0, Math.min(1, (e.clientX - plotLeft) / plotWidth));
      setZoomRange((prev) => {
        const [s, en] = prev ?? [0, total];
        const visible = en - s;
        const anchorIdx = s + mouseRatio * visible;
        let newVisible = e.deltaY < 0 ? Math.max(20, Math.floor(visible * 0.8)) : Math.floor(visible * 1.25);
        if (newVisible >= total) return null;
        let newStart = Math.round(anchorIdx - mouseRatio * newVisible);
        newStart = Math.max(0, Math.min(total - newVisible, newStart));
        return [newStart, newStart + newVisible];
      });
    };

    const handleDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragRef.current = { active: true, startX: e.clientX, startRange: zoomRange ?? [0, total] };
    };
    const handleMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.active || !d.startRange) return;
      const dx = e.clientX - d.startX;
      if (Math.abs(dx) < 5) return;
      const grid = el.querySelector(".recharts-cartesian-grid") as SVGGElement | null;
      const plotWidth = grid ? grid.getBoundingClientRect().width : el.clientWidth - 70;
      const [s0, e0] = d.startRange;
      const visible = e0 - s0;
      const shift = -Math.round((dx / plotWidth) * visible);
      const newStart = Math.max(0, Math.min(total - visible, s0 + shift));
      setZoomRange([newStart, newStart + visible]);
    };
    const handleUp = () => { dragRef.current.active = false; };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("mousedown", handleDown);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [total, zoomRange]);

  const tickInterval = Math.max(1, Math.floor(slicedDates.length / 12));
  const isZoomed = zoomRange !== null;

  return (
    <div className="relative select-none" ref={containerRef}>
      {isZoomed && (
        <button
          onClick={() => setZoomRange(null)}
          className="absolute right-2 top-2 z-10 rounded px-2 py-1 text-xs"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          🔍 전체 보기
        </button>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
            width={55}
            stroke="var(--border)"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              boxShadow: "var(--shadow-md)",
              color: "var(--text-primary)",
            }}
            labelStyle={{ color: "var(--text-secondary)" }}
            itemStyle={{ fontFamily: "var(--font-mono)", padding: "2px 0" }}
            cursor={{ stroke: "var(--chart-crosshair)", strokeWidth: 1, strokeDasharray: "3 3" }}
            formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey={labelA} stroke="#0072B2" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey={labelB} stroke="#E69F00" dot={false} strokeWidth={2} strokeDasharray="5 5" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        💡 휠=확대/축소 · 드래그=좌우 이동
      </p>
    </div>
  );
}
