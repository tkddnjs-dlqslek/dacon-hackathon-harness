"use client";

// visualization.md §1.1: 단일 값 비교 (N≤8) → Bar Chart (가로), 정렬: 값 내림차순
// 11개 섹터이므로 세로 가로 혼용 — 가로 바로 구현

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { SECTOR_COLORS } from "@/types";

interface SectorReturn {
  sector: string;
  ticker: string;
  value: number; // 수익률 (소수)
}

interface Props {
  data: SectorReturn[];
  label?: string;
}

export default function SectorBarChart({ data, label = "Return" }: Props) {
  const chartData = data.map((d) => ({
    name: d.sector,
    ticker: d.ticker,
    value: +(d.value * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(250, data.length * 30)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          width={100}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
          formatter={(value) => [`${Number(value).toFixed(1)}%`, label]}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.value >= 0
                ? (SECTOR_COLORS[entry.name] ?? "#10B981")
                : "#EF4444"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
