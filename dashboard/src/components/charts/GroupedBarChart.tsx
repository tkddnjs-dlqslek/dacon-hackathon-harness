"use client";

// visualization.md §1.1: A vs B 단일값 비교 → Grouped Bar Chart

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  data: { label: string; etf: number; direct: number }[];
  formatValue?: (v: number) => string;
}

export default function GroupedBarChart({ data, formatValue = (v) => v.toFixed(1) }: Props) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#374151" }} />
        <YAxis tick={{ fontSize: 10, fill: "#374151" }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8 }}
          formatter={(value) => [formatValue(Number(value))]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="etf" name="ETF" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="direct" name="직접 투자" fill="#F97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
