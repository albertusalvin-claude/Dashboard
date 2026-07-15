"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from "recharts";
import type { BPEntry } from "../lib/getBPLog";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d} ${MONTHS[+m - 1]}`;
}

function bpCategory(sys: number, dia: number): { label: string; color: string } {
  if (sys < 120 && dia < 80) return { label: "Optimal", color: "#4E7043" };
  if (sys < 130 && dia < 85) return { label: "Normal", color: "#4E7043" };
  if (sys < 140 || dia < 90) return { label: "High-normal", color: "#B4832A" };
  if (sys < 160 || dia < 100) return { label: "Stage 1", color: "#CB3A1E" };
  return { label: "Stage 2+", color: "#CB3A1E" };
}

type Props = { entries: BPEntry[] };

export default function BPSection({ entries }: Props) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const hasData = sorted.length > 0;

  const cat = hasData ? bpCategory(last.systolic, last.diastolic) : null;
  const recent7 = sorted.slice(-7);
  const avgSys = hasData
    ? Math.round(recent7.reduce((s, e) => s + e.systolic, 0) / recent7.length)
    : null;
  const avgDia = hasData
    ? Math.round(recent7.reduce((s, e) => s + e.diastolic, 0) / recent7.length)
    : null;

  const hrNote =
    !last?.heartRate ? "normal 60–100"
    : last.heartRate > 90 ? "high end — rest 5 min first"
    : last.heartRate < 60 ? "low — normal if fit"
    : "normal range";

  const chartData = sorted.map((e) => ({
    date: fmt(e.date),
    Systolic: e.systolic,
    Diastolic: e.diastolic,
  }));

  const stats = [
    {
      label: "Latest BP",
      value: hasData ? `${last.systolic}/${last.diastolic}` : "—",
      unit: "mmHg",
      note: hasData ? fmt(last.date) : "no readings",
      color: "#4E7043",
    },
    {
      label: "Category",
      value: cat?.label ?? "—",
      unit: "",
      note: "optimal < 120/80",
      color: cat?.color ?? "#403A7A",
      valueColor: cat?.color,
    },
    {
      label: "Resting HR",
      value: last?.heartRate ? String(last.heartRate) : "—",
      unit: "bpm",
      note: hrNote,
      color: "#B4832A",
    },
    {
      label: "7-Reading Avg",
      value: avgSys && avgDia ? `${avgSys}/${avgDia}` : "—",
      unit: "mmHg",
      note: "last 7 readings",
      color: "#CB3A1E",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, unit, note, color, valueColor }) => (
          <div key={label} className="bg-card rounded-2xl border border-line p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: color }} />
            <p className="text-xs text-ink-soft font-medium pl-3">{label}</p>
            <p
              className="font-mono font-bold text-xl text-ink mt-2 pl-3 leading-none"
              style={valueColor ? { color: valueColor } : undefined}
            >
              {value}
              {unit && <span className="text-sm font-normal text-ink-soft"> {unit}</span>}
            </p>
            <p className="font-mono text-xs text-ink-soft mt-1.5 pl-3">{note}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-line p-5">
        <h3 className="font-display font-bold text-lg text-ink mb-1">Trend</h3>
        <p className="text-xs text-ink-soft mb-5">
          Dark = systolic, indigo = diastolic. Green band is the optimal zone (80–120). Single readings
          bounce around; the trend is what counts.
        </p>
        {sorted.length < 2 ? (
          <p className="text-center text-ink-soft text-sm py-10 italic">
            Add another reading to see the trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,51,39,0.09)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#42574a" }} />
              <YAxis domain={[50, 160]} tick={{ fontSize: 11, fill: "#42574a" }} />
              <Tooltip
                formatter={(v, name) => [`${v} mmHg`, name]}
                contentStyle={{ borderRadius: 10, border: "1px solid rgba(27,51,39,0.14)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#42574a" }} />
              <ReferenceArea y1={80} y2={120} fill="rgba(78,112,67,0.1)" />
              <Line
                type="monotone"
                dataKey="Systolic"
                stroke="#1B3327"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#1B3327" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Diastolic"
                stroke="#403A7A"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#403A7A" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-line p-5">
        <h3 className="font-display font-bold text-lg text-ink mb-4">Readings</h3>
        {sorted.length === 0 ? (
          <p className="text-center text-ink-soft text-sm py-6 italic">No readings yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Date", "BP", "HR", "Category"].map((h, i) => (
                  <th
                    key={h}
                    className={`pb-2 text-xs font-mono uppercase tracking-wide text-ink-soft font-normal ${i === 0 ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((e) => {
                const { label, color } = bpCategory(e.systolic, e.diastolic);
                return (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="py-2.5 text-ink">{fmt(e.date)}</td>
                    <td className="py-2.5 text-right font-mono text-ink">
                      {e.systolic}/{e.diastolic}
                    </td>
                    <td className="py-2.5 text-right font-mono text-ink-soft">
                      {e.heartRate ? `${e.heartRate} bpm` : "—"}
                    </td>
                    <td className="py-2.5 text-right text-xs font-medium" style={{ color }}>
                      {label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
