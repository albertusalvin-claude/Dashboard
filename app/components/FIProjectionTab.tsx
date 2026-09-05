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
  FI_FIELDS,
  type FIAssumptions,
  type FIFieldGroup,
} from "../lib/fiProjection";
import { saveFIAssumptions } from "../actions/fiAssumptions";

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
  { key: "total", label: "Total Asset", dataKey: "asset", name: "Total Asset", color: COLOR.asset },
  { key: "investment", label: "Investment", dataKey: "investment", name: "Investment", color: COLOR.investment },
  { key: "saving", label: "Saving", dataKey: "saving", name: "Saving", color: COLOR.saving },
  { key: "superannuation", label: "Superannuation", dataKey: "superannuation", name: "Superannuation", color: COLOR.superannuation },
] as const;
type AssetViewKey = (typeof ASSET_VIEWS)[number]["key"];

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

type Props = { initialAssumptions: FIAssumptions };

export default function FIProjectionTab({ initialAssumptions }: Props) {
  // `draft` is what the inputs show as you type. `applied` is what the
  // chart/table are actually computed from. They only sync — and Notion
  // only gets written to — when Rebuild is clicked.
  const [draft, setDraft] = useState<FIAssumptions>(initialAssumptions);
  const [applied, setApplied] = useState<FIAssumptions>(initialAssumptions);
  const [view, setView] = useState<"table" | "chart">("chart");
  const [chartMode, setChartMode] = useState<AssetViewKey>("total");
  const [isRebuilding, startRebuild] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const rows = useMemo(() => computeFIProjection(applied), [applied]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);

  const setField = (key: keyof FIAssumptions, value: number) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  function handleRebuild() {
    setSaveError(null);
    setApplied(draft);
    startRebuild(async () => {
      const result = await saveFIAssumptions(draft);
      if (!result.ok) setSaveError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Assumptions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GROUP_ORDER.map((group) => (
          <FieldGroup key={group} group={group} values={draft} onChange={setField} />
        ))}
      </div>

      {/* Result */}
      <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-ink">Projection</h3>
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
            <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,51,39,0.09)" />
              <XAxis
                dataKey="calendarYear"
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
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[760px]">
              <thead>
                <tr className="border-b border-line">
                  {[
                    "Year",
                    "Income",
                    "Investment",
                    "Saving",
                    "Superannuation",
                    "Spending",
                    "Asset",
                    "Inv. Spending Ratio",
                    "Asset Spending Ratio",
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
                {rows.map((r) => (
                  <tr key={r.year} className="border-b border-line last:border-0">
                    <td className="py-1.5 px-2 font-mono text-ink">{r.calendarYear}</td>
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
