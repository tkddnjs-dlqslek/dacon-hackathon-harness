"use client";

// E2 — KPI 카드용 미니 라인 차트
// SVG 경량 구현, recharts 사용 안 함 (KPI 카드에 12-50개 inline용)
// SSR/CSR 데이터 순서 불일치로 인한 hydration mismatch 방지 — mount 후 렌더

import { useEffect, useState } from "react";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  strokeWidth?: number;
}

export default function Sparkline({
  values,
  width = 80,
  height = 28,
  color = "var(--accent)",
  showArea = true,
  strokeWidth = 1.4,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !values || values.length < 2) {
    return <span className="inline-block" style={{ width, height }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 2;
  const h = height - pad * 2;

  const points = values.map((v, i) => ({
    x: i * stepX,
    y: pad + h - ((v - min) / range) * h,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  // 변화 방향 — 마지막 vs 처음
  const positive = values[values.length - 1] >= values[0];
  const finalColor = color === "auto"
    ? (positive ? "var(--positive)" : "var(--negative)")
    : color;
  const fillColor = positive ? "var(--chart-positive-fill)" : "var(--chart-negative-fill)";

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {showArea && <path d={areaPath} fill={fillColor} />}
      <path d={linePath} fill="none" stroke={finalColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
