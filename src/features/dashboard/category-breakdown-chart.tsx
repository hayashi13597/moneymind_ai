"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatVnd } from "@/lib/money";

import type { CategoryBreakdownItem } from "./service";

const FALLBACK_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

type CategoryBreakdownChartProps = {
  data: CategoryBreakdownItem[];
};

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Chưa có dữ liệu chi tiêu để vẽ biểu đồ.
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height={256}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="name"
            innerRadius={58}
            outerRadius={92}
            paddingAngle={3}
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? formatVnd(value) : String(value)
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
