"use client";

// visualization.md §1.1: A vs B 시계열 → Dual Line Chart, 영역 차이 음영

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  dates: string[];
  seriesA: number[]; // ETF 누적 가치
  seriesB: number[]; // 직접투자 누적 가치
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
  const data = dates.map((date, i) => ({
    date,
    [labelA]: +(seriesA[i]).toFixed(0),
    [labelB]: +(seriesB[i]).toFixed(0),
  }));

  const tickInterval = Math.max(1, Math.floor(dates.length / 12));

  return (
    <ResponsiveContainer width="100%" height={300}>
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
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
          width={55}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey={labelA}
          stroke="#3B82F6"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey={labelB}
          stroke="#F59E0B"
          dot={false}
          strokeWidth={2}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
