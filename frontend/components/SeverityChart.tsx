"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SEVERITY_FILL, SEVERITY_ORDER } from "@/lib/ui";

export function SeverityChart({
  counts,
  height = 220,
}: {
  counts: Record<string, number>;
  height?: number;
}) {
  const data = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    count: counts[sev] ?? 0,
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="severity"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "#1e293b" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 8,
              color: "#e2e8f0",
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.severity}
                fill={SEVERITY_FILL[entry.severity] ?? "#64748b"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
