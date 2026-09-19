"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  computeFIProjection,
  interpolateYearMonthly,
  FI_FIELDS,
  type FIAssumptions,
  type FIFieldGroup,
} from "../lib/fiProjection";
import { saveFIAssumptions } from "../actions/fiAssumptions";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";
import type { AssetGrowthEntry } from "../lib/getAssetGrowthLog";

// Same fixed categorical order already used across the app's charts
// (see SpendingBreakdown.tsx) — kept for visual consistency rather than
// introducing a second palette for one new chart.
const COLOR = {
  investment: "#4E7043", // kale
  saving: "#403A7A", // blueberry
  superannuation: "#B4832A", // gold
  spending: "#CB3A1E", // chili
  asset: "#1B3327", // ink
};

const dollars = (v: number, decimals = 0) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const compactDollars = (v: number) =>
  `$${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v)}`;

const ratio = (v: number) => `${v.toFixed(2)}x`;

// Each chart mode shows exactly one asset-side series (never combined) plus
// the Spending line, which is added separately in every mode.
const ASSET_VIEWS = [
  { key: "total", label: "Total Liquid Asset", dataKey: "asset", name: "Total Liquid Asset", color: COLOR.asset },
  { key: "investment", label: "Investment", dataKey: "investment", name: "Investment", color: COLOR.investment },
  { key: "saving", label: "Saving", dataKey: "saving", name: "Saving", color: COLOR.saving },
  { key: "superannuation", label: "Superannuation", dataKey: "superannuation", name: "Superannuation", color: COLOR.superannuation },
] as const;
type AssetViewKey = (typeof ASSET_VIEWS)[number]["key"];

// Which merged-row field holds the logged "actual" value for each chart mode.
const ACTUAL_KEY: Record<AssetViewKey, "actualAsset" | "actualInvestment" | "actualSaving" | "actualSuperannuation"> = {
  total: "actualAsset",
  investment: "actualInvestment",
  saving: "actualSaving",
  superannuation: "actualSuperannuation",
};
const ACTUAL_COLOR = "#42574a"; // ink-soft — neutral, distinct from the categorical palette

const GROUP_LABEL: Record<FIFieldGroup, string> = {
  income: "Income",
  startingPoint: "Starting point",
  spendingBudget: "Spending budget",
  rates: "Rate assumptions",
  length: "Projection length",
};
// Starting point leads (top-left) since it's the anchor for everything else.
// Projection length isn't part of this grid at all — it lives in the
// Settings block below the chart/table instead.
const GROUP_ORDER: FIFieldGroup[] = ["startingPoint", "income", "spendingBudget", "rates"];

function FieldGroup({
  group,
  values,
  onChange,
}: {
  group: FIFieldGroup;
  values: FIAssumptions;
  onChange: (key: keyof FIAssumptions, value: number) => void;
}) {
  const fields = FI_FIELDS.filter((f) => f.group === group);
  return (
    <div className="bg-card rounded-2xl border border-line p-4">
      <p className="font-mono text-xs text-ink-soft uppercase tracking-wide mb-3">{GROUP_LABEL[group]}</p>
      <div className="space-y-2.5">
        {fields.map(({ key, label, percent, locked }) => {
          const raw = values[key];
          const display = percent ? +(raw * 100).toFixed(4) : raw;
          return (
            <label key={key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-soft">{label}</span>
              {locked ? (
                <span className="font-mono text-ink" title="Fixed starting point — edit in Notion">
                  {dollars(raw)}
                </span>
              ) : (
                <span className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    value={display}
                    onChange={(e) => {
                      const n = e.target.valueAsNumber;
                      if (Number.isNaN(n)) return;
                      onChange(key, percent ? n / 100 : n);
                    }}
                    className="w-24 rounded-lg border border-line bg-paper px-2 py-1 text-right font-mono text-ink focus:outline-none focus:border-ink-soft"
                  />
                  <span className="font-mono text-xs text-ink-soft w-3">{percent ? "%" : ""}</span>
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  initialAssumptions: FIAssumptions;
  actualLog: AssetGrowthEntry[];
};

export default function FIProjectionTab({ initialAssumptions, actualLog }: Props) {
  // `draft` is what the inputs show as you type. `applied` is what the
  // chart/table are actually computed from. They only sync — and Notion
  // only gets written to — when Rebuild is clicked.
  const [draft, setDraft] = useState<FIAssumptions>(initialAssumptions);
  const [applied, setApplied] = useState<FIAssumptions>(initialAssumptions);
  const [view, setView] = useState<"table" | "chart">("chart");
  const [chartMode, setChartMode] = useState<AssetViewKey>("total");
  const [scope, setScope] = useState<"full" | "year">("full");
  // Which year the Monthly Projection zoom looks at — defaults to the real
  // current year, but is an editable field below rather than being locked
  // to "today" forever.
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [isRebuilding, startRebuild] = useTransition();
  const isDummy = useIsDummyRoute();
  const [saveError, setSaveError] = useState<string | null>(null);

  const rows = useMemo(() => computeFIProjection(applied), [applied]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  // Attach the earliest logged month per calendar year onto the matching
  // projection row, so actual and projected can share one chart. Each
  // projection row represents the *beginning* of its year, so the fairest
  // "actual" point is the earliest one logged that year, not the latest.
  // "Actual investment" maps from the overview's rolled-up Liquid Investment;
  // Total Liquid Asset excludes Stock Options on both sides, so the
  // comparison stays apples-to-apples (the projection never modeled Stock
  // Options either).
  const chartRows = useMemo(() => {
    const earliestByYear = new Map<number, AssetGrowthEntry>();
    for (const entry of actualLog) {
      const year = parseInt(entry.month.slice(0, 4), 10);
      const existing = earliestByYear.get(year);
      if (!existing || entry.month < existing.month) earliestByYear.set(year, entry);
    }
    return rows.map((r) => {
      const actual = earliestByYear.get(r.calendarYear);
      return {
        ...r,
        actualAsset: actual?.liquidAsset,
        actualInvestment: actual?.liquidInvestment,
        actualSaving: actual?.savings,
        actualSuperannuation: actual?.superannuation,
      };
    });
  }, [rows, actualLog]);
  // Zoomed-in view: `selectedYear`'s annual row interpolated into 12 months
  // (see interpolateYearMonthly — there's no monthly model, this is a
  // smoother read of the same annual curve). The actual overlay here plots
  // every month logged that year, not just the earliest, since we finally
  // have the resolution to show more than one point.
  const minYear = rows[0]?.calendarYear ?? selectedYear;
  const maxYear = rows[rows.length - 1]?.calendarYear ?? selectedYear;
  const monthRows = useMemo(() => interpolateYearMonthly(rows, selectedYear), [rows, selectedYear]);
  const monthChartRows = useMemo(() => {
    const byMonth = new Map<string, AssetGrowthEntry>();
    for (const entry of actualLog) {
      if (entry.month.startsWith(`${selectedYear}-`)) byMonth.set(entry.month, entry);
    }
    return monthRows.map((m) => {
      const actual = byMonth.get(`${selectedYear}-${String(m.monthIndex + 1).padStart(2, "0")}`);
      return {
        ...m,
        actualAsset: actual?.liquidAsset,
        actualInvestment: actual?.liquidInvestment,
        actualSaving: actual?.savings,
        actualSuperannuation: actual?.superannuation,
      };
    });
  }, [monthRows, actualLog, selectedYear]);

  // Recharts infers its `data` generic from a single concrete shape; year vs
  // month rows are structurally different (calendarYear+year vs monthLabel+
  // monthIndex), so widen to a loose record type rather than fighting it.
  const activeChartData: Record<string, unknown>[] = scope === "year" ? monthChartRows : chartRows;
  const actualKey = ACTUAL_KEY[chartMode];
  const hasActualForMode = activeChartData.some((r) => r[actualKey] != null);

  const setField = (key: keyof FIAssumptions, value: number) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  function handleRebuild() {
    setSaveError(null);
    // The projection still recomputes from the draft — only the write is held.
    setApplied(draft);
    if (isDummy) {
      setSaveError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startRebuild(async () => {
      const result = await saveFIAssumptions(draft);
      if (!result.ok) setSaveError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Result */}
      <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg text-ink">Projection</h3>
            <div className="relative group">
              <span className="w-4 h-4 rounded-full bg-ink text-paper text-[10px] font-mono leading-none flex items-center justify-center cursor-help select-none shrink-0">
                ?
              </span>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-soft leading-relaxed opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              >
                The dashed "Actual" line uses each year's earliest logged entry, matching the projection's
                own beginning-of-year convention. Total Liquid Asset (projected and actual) excludes Stock
                Options — they're illiquid, and the projection model doesn't account for them at all.
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`font-mono text-xs px-3 py-1.5 rounded-full border capitalize transition-colors
                  ${view === v ? "bg-ink text-paper border-ink" : "text-ink-soft border-line hover:border-ink-soft hover:text-ink"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScope("full")}
            className={`font-mono text-xs px-3 py-1.5 rounded-full border transition-colors
              ${scope === "full" ? "bg-ink text-paper border-ink" : "text-ink-soft border-line hover:border-ink-soft hover:text-ink"}`}
          >
            Full projection
          </button>
          <div className="flex items-center gap-1">
            <div className="relative group">
              <button
                onClick={() => setScope("year")}
                className={`font-mono text-xs px-3 py-1.5 rounded-full border transition-colors
                  ${scope === "year" ? "bg-ink text-paper border-ink" : "text-ink-soft border-line hover:border-ink-soft hover:text-ink"}`}
              >
                Monthly Projection
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-96 space-y-2 rounded-lg border border-line bg-card px-3 py-2.5 text-xs text-ink-soft leading-relaxed opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              >
                <p>
                  There's no monthly model underneath — this zooms the year's own annual figures into 12
                  points.
                </p>
                <p>
                  <strong className="text-ink">Investment, Saving, Superannuation</strong> — geometric
                  interpolation between this year's (start) and next year's (end) values, since they're
                  balances that compound smoothly through the year:
                </p>
                <p className="font-mono text-ink bg-paper rounded px-2 py-1 text-center">
                  value(month) = start × (end ÷ start)^(month ÷ 12)
                </p>
                <p>
                  <strong className="text-ink">Liquid Asset</strong> — always their sum for that month,
                  never interpolated on its own.
                </p>
                <p>
                  <strong className="text-ink">Income, Spending</strong> — held flat at this year's own
                  value all 12 months, since these typically aren't updated that frequently in real life (a
                  salary or budget usually changes once a year, not gradually).
                </p>
                <p>Both ratio columns are recomputed from these values month by month.</p>
              </div>
            </div>
            <input
              type="number"
              value={selectedYear}
              min={minYear}
              max={maxYear}
              onChange={(e) => {
                const n = e.target.valueAsNumber;
                if (Number.isNaN(n)) return;
                setSelectedYear(Math.min(maxYear, Math.max(minYear, Math.round(n))));
                setScope("year");
              }}
              className="w-20 rounded-full border border-line bg-paper px-2 py-1.5 text-center font-mono text-xs text-ink focus:outline-none focus:border-ink-soft"
            />
          </div>
        </div>

        {view === "chart" && (
          <div className="flex flex-wrap gap-2">
            {ASSET_VIEWS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartMode(key)}
                className={`font-mono text-xs px-3 py-1.5 rounded-full border transition-colors
                  ${chartMode === key ? "bg-ink text-paper border-ink" : "text-ink-soft border-line hover:border-ink-soft hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {view === "chart" ? (
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={activeChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,51,39,0.09)" />
              <XAxis
                dataKey={scope === "year" ? "monthLabel" : "calendarYear"}
                tick={{ fontSize: 11, fill: "#42574a" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "#42574a" }} tickFormatter={compactDollars} width={56} />
              <Tooltip
                formatter={(v) => dollars(Number(v), 2)}
                labelFormatter={(y) => y}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(27,51,39,0.14)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {ASSET_VIEWS.filter((v) => v.key === chartMode).map(({ key, dataKey, name, color }) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={dataKey}
                  name={name}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
              ))}
              <Line
                type="monotone"
                dataKey="spending"
                name="Spending"
                stroke={COLOR.spending}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
              {hasActualForMode && (
                <Line
                  type="monotone"
                  dataKey={actualKey}
                  name="Actual"
                  stroke={ACTUAL_COLOR}
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  dot={{ r: 4, fill: ACTUAL_COLOR }}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[760px]">
              <thead>
                <tr className="border-b border-line">
                  {[
                    scope === "year" ? "Month" : "Year",
                    "Income",
                    "Investment",
                    "Saving",
                    "Superannuation",
                    "Spending",
                    "Liquid Asset",
                    "Inv. Spending Ratio",
                    "Liquid Asset Spending Ratio",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`py-2 px-2 font-mono uppercase tracking-wide text-ink-soft font-normal whitespace-nowrap ${i === 0 ? "text-left" : "text-right"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(scope === "year" ? monthRows : rows).map((r) => (
                  <tr
                    key={"year" in r ? r.year : `${r.calendarYear}-${r.monthIndex}`}
                    className="border-b border-line last:border-0"
                  >
                    <td className="py-1.5 px-2 font-mono text-ink">{"year" in r ? r.calendarYear : r.monthLabel}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink">{dollars(r.income, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink">{dollars(r.investment, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink">{dollars(r.saving, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink">{dollars(r.superannuation, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: COLOR.spending }}>
                      {dollars(r.spending, 2)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-ink">{dollars(r.asset, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink-soft">{ratio(r.investmentSpendingRatio)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink-soft">{ratio(r.assetSpendingRatio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assumptions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GROUP_ORDER.map((group) => (
          <FieldGroup key={group} group={group} values={draft} onChange={setField} />
        ))}
      </div>

      {/* Settings */}
      <div className="bg-card rounded-2xl border border-line p-4 flex flex-wrap items-center gap-4">
        <span className="font-mono text-xs text-ink-soft uppercase tracking-wide">Settings</span>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft">Projection length</span>
          <input
            type="number"
            min={1}
            max={60}
            value={draft.years}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (Number.isNaN(n)) return;
              setField("years", Math.round(n));
            }}
            className="w-20 rounded-lg border border-line bg-paper px-2 py-1 text-right font-mono text-ink focus:outline-none focus:border-ink-soft"
          />
          <span className="font-mono text-xs text-ink-soft">years</span>
        </label>

        <button
          onClick={handleRebuild}
          disabled={isRebuilding || !dirty}
          className="font-mono text-xs px-4 py-2 rounded-full bg-ink text-paper transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
        >
          {isRebuilding ? "Rebuilding…" : "Rebuild"}
        </button>
        <span className="font-mono text-xs" style={{ color: saveError ? COLOR.spending : "#42574a" }}>
          {saveError ?? (isRebuilding ? "Saving to Notion…" : dirty ? "Unsaved changes" : "Up to date")}
        </span>
      </div>
    </div>
  );
}
