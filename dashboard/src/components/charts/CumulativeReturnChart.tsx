"use client";

// visualization.md §1.1: 시계열 + 다중 종목 → Multi-line Chart

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { SECTOR_COLORS } from "@/types";

interface Series {
  ticker: string;
  sector: string;
  cumulativeReturns: number[]; // 각 날짜별 누적 수익률
}

interface Props {
  dates: string[];
  series: Series[];
}

export default function CumulativeReturnChart({ dates, series }: Props) {
  // Recharts용 데이터 변환
  const data = dates.map((date, i) => {
    const point: Record<string, string | number> = { date };
    for (const s of series) {
      point[s.ticker] = +(s.cumulativeReturns[i] * 100).toFixed(2);
    }
    return point;
  });

  // X축 라벨 간격 (너무 빽빽하지 않게)
  const tickInterval = Math.max(1, Math.floor(dates.length / 12));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          interval={tickInterval}
          tickFormatter={(d: string) => d.slice(5)} // MM-DD
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
        {series.map((s) => (
          <Line
            key={s.ticker}
            type="monotone"
            dataKey={s.ticker}
            stroke={SECTOR_COLORS[s.sector] ?? "#94A3B8"}
            dot={false}
            strokeWidth={1.5}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
