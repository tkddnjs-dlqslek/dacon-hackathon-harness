"use client";

// visualization.md §1.1: 구성 비율 → Donut Chart, 항목 ≤ 6개 초과 시 "기타" 묶음

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SECTOR_COLORS } from "@/types";

interface SectorWeight {
  sector: string;
  weight: number; // 0~1
}

interface Props {
  data: SectorWeight[];
}

export default function SectorDonutChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.sector,
    value: +(d.weight * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, value }) => `${value}%`}
          labelLine={{ stroke: "#4b5563" }}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={SECTOR_COLORS[entry.name] ?? "#94A3B8"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
          formatter={(value) => [`${Number(value).toFixed(1)}%`]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string) => <span style={{ color: "#9ca3af" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
