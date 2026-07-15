"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { WeightEntry } from "../lib/getWeightLog";

const START_DATE = "2026-07-12";
const START_KG = 59.1;
const TARGET_KG = 63.1;
const TARGET_DATE = "2026-12-14";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d} ${MONTHS[+m - 1]}`;
}

type Props = { entries: WeightEntry[] };

export default function WeightSection({ entries }: Props) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const hasData = sorted.length > 0;

  const change = hasData ? last.kg - START_KG : null;
  const togo = hasData ? TARGET_KG - last.kg : null;

  const startMs = new Date(START_DATE).getTime();
  const lastMs = hasData ? new Date(last.date).getTime() : null;
  const weeks = lastMs ? (lastMs - startMs) / (7 * 24 * 60 * 60 * 1000) : 0;
  const pace = weeks >= 1 && change !== null ? (change / weeks) * 1000 : null;

  const paceNote =
    pace === null ? "need 1+ week of data"
    : pace < 80 ? "below target — add calories"
    : pace > 350 ? "fast — may add fat"
    : "on track";

  const targetMs = new Date(TARGET_DATE).getTime();
  const targetSlope = (TARGET_KG - START_KG) / (targetMs - startMs);

  // Target line spans full range (start → goal), actual dots only at real entries
  const allDates = [...new Set([START_DATE, ...sorted.map((e) => e.date), TARGET_DATE])].sort();
  const chartData = allDates.map((date) => {
    const t = new Date(date).getTime();
    const entry = sorted.find((e) => e.date === date);
    return {
      date: fmt(date),
      Actual: entry?.kg ?? null,
      "Target pace": parseFloat((START_KG + targetSlope * (t - startMs)).toFixed(2)),
    };
  });

  const stats = [
    {
      label: "Current",
      value: hasData ? `${last.kg.toFixed(1)} kg` : "—",
      note: hasData ? fmt(last.date) : "no entries",
      color: "#4E7043",
    },
    {
      label: "Change",
      value: change !== null ? `${change >= 0 ? "+" : ""}${change.toFixed(1)} kg` : "—",
      note: `since ${fmt(START_DATE)}`,
      color: "#403A7A",
    },
    {
      label: "To go",
      value: togo !== null ? `${togo.toFixed(1)} kg` : "—",
      note: "target 63.1 kg",
      color: "#B4832A",
    },
    {
      label: "Pace",
      value: pace !== null ? `${pace >= 0 ? "+" : ""}${Math.round(pace)} g/wk` : "—",
      note: paceNote,
      color: "#CB3A1E",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, note, color }) => (
          <div key={label} className="bg-card rounded-2xl border border-line p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: color }} />
            <p className="text-xs text-ink-soft font-medium pl-3">{label}</p>
            <p className="font-mono font-bold text-2xl text-ink mt-2 pl-3 leading-none">{value}</p>
            <p className="font-mono text-xs text-ink-soft mt-1.5 pl-3">{note}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-line p-5">
        <h3 className="font-display font-bold text-lg text-ink mb-1">Progress</h3>
        <p className="text-xs text-ink-soft mb-5">
          Dashed line = target pace (59.1 → 63.1 kg by mid-December). Weigh in at the same time each day.
        </p>
        {sorted.length === 0 ? (
          <p className="text-center text-ink-soft text-sm py-10 italic">
            No entries yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,51,39,0.09)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#42574a" }} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "#42574a" }}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                formatter={(v, name) => [`${Number(v).toFixed(1)} kg`, name]}
                contentStyle={{ borderRadius: 10, border: "1px solid rgba(27,51,39,0.14)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#42574a" }} />
              <ReferenceLine
                y={TARGET_KG}
                stroke="#CB3A1E"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{ value: `Goal ${TARGET_KG} kg`, position: "insideTopRight", fill: "#CB3A1E", fontSize: 11, fontFamily: "monospace" }}
              />
              <Line
                type="monotone"
                dataKey="Actual"
                stroke="#4E7043"
                strokeWidth={2.5}
                connectNulls={false}
                dot={(props: any) =>
                  props.value != null
                    ? <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill="#4E7043" />
                    : <g key={props.key} />
                }
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Target pace"
                stroke="rgba(27,51,39,0.35)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-line p-5">
        <h3 className="font-display font-bold text-lg text-ink mb-4">History</h3>
        {sorted.length === 0 ? (
          <p className="text-center text-ink-soft text-sm py-6 italic">No entries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Date", "Weight", "Change"].map((h, i) => (
                  <th
                    key={h}
                    className={`pb-2 text-xs font-mono uppercase tracking-wide text-ink-soft font-normal ${i > 0 ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((e, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? e.kg - prev.kg : null;
                return (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="py-2.5 text-ink">{fmt(e.date)}</td>
                    <td className="py-2.5 text-right font-mono text-ink">{e.kg.toFixed(1)} kg</td>
                    <td
                      className="py-2.5 text-right font-mono"
                      style={{
                        color:
                          diff === null ? "#42574a"
                          : diff > 0 ? "#4E7043"
                          : "#CB3A1E",
                      }}
                    >
                      {diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`}
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
