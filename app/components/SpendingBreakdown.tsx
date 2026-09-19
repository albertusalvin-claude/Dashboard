"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SpendingEntry } from "../api/spending/route";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const PALETTE = [
  "#4E7043", "#403A7A", "#B4832A", "#CB3A1E",
  "#7B9E6F", "#7A6EB4", "#D4A84B", "#E06B56",
];

function toDollars(v: number) {
  return `$${v.toFixed(2)}`;
}

type Props = {
  entries: SpendingEntry[];
  title: string;
  pieKey: (e: SpendingEntry) => string;
  pieLabel: string;
};

export default function SpendingBreakdown({ entries, title, pieKey, pieLabel }: Props) {
  const pieMap: Record<string, number> = {};
  for (const e of entries) {
    const key = pieKey(e) || "Other";
    pieMap[key] = (pieMap[key] ?? 0) + e.amount;
  }
  const pieData = Object.entries(pieMap)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const monthSet = new Set(entries.map((e) => e.date.slice(0, 7)).filter(Boolean));
  const barData = [...monthSet].sort().map((ym) => {
    const [, m] = ym.split("-");
    const total = entries
      .filter((e) => e.date.startsWith(ym))
      .reduce((s, e) => s + e.amount, 0);
    return { month: MONTHS[+m - 1] ?? ym, total: parseFloat(total.toFixed(2)) };
  });

  const total = entries.reduce((s, e) => s + e.amount, 0);

  if (entries.length === 0) {
    return <p className="text-center text-ink-soft text-sm py-6 italic">No entries yet.</p>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between mb-4">
        <span className="font-mono text-xs text-ink-soft uppercase tracking-wide">Total: {toDollars(total)}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-mono text-ink-soft uppercase tracking-wide mb-3">By {pieLabel}</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                // Labels sit outside the arc, so the radius has to leave room
                // for them inside the container — at 82 the top one clipped.
                outerRadius={76}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => toDollars(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-xs font-mono text-ink-soft uppercase tracking-wide mb-3">By month</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,51,39,0.09)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#42574a" }} />
              <YAxis tick={{ fontSize: 11, fill: "#42574a" }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => toDollars(Number(v))} />
              <Bar dataKey="total" name="Spend" fill="#4E7043" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
