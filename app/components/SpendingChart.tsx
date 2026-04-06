"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SpendingEntry } from "../api/spending/route";

type Props = { entries: SpendingEntry[] };

export default function SpendingChart({ entries }: Props) {
  // Aggregate spending by month
  const monthlyMap: Record<string, number> = {};
  for (const entry of entries) {
    const month = entry.date.slice(0, 7); // "YYYY-MM"
    monthlyMap[month] = (monthlyMap[month] ?? 0) + entry.amount;
  }

  const data = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month: new Date(month + "-01").toLocaleString("default", {
        month: "short",
        year: "2-digit",
      }),
      total: parseFloat(total.toFixed(2)),
    }));

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-base font-semibold text-gray-700 mb-4">Spending Over Time</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Total"]} />
          <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
