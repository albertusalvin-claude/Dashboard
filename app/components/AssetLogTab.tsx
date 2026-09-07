"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dedupeLatest } from "../lib/dedupeLatest";
import type { AssetGrowthEntry } from "../lib/getAssetGrowthLog";
import type { InvestmentLogEntry } from "../lib/getInvestmentLog";
import type { SavingsLogEntry } from "../lib/getSavingsLog";
import type { SuperannuationLogEntry } from "../lib/getSuperannuationLog";
import type { StockOptionsLogEntry } from "../lib/getStockOptionsLog";
import {
  addInvestmentLogEntry,
  updateInvestmentLogEntry,
  addSavingsLogEntry,
  updateSavingsLogEntry,
  addSuperannuationLogEntry,
  updateSuperannuationLogEntry,
  addStockOptionsLogEntry,
  updateStockOptionsLogEntry,
} from "../actions/assetLog";

const dollars = (v: number, decimals = 0) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const today = () => new Date().toISOString().slice(0, 10);

const inputCls =
  "rounded-lg border border-line bg-paper px-2 py-1 font-mono text-ink focus:outline-none focus:border-ink-soft";

type ActionResult = { ok: true } | { ok: false; error: string };
// "select" renders as a text input with a <datalist> of suggestions — Notion
// auto-creates a new option the first time it sees a name, so this is never
// a hard constraint, just an autocomplete list.
type FieldSpec = { key: string; label: string; type: "date" | "text" | "select"; options?: string[] };
type LogRow = Record<string, string | number> & { id: string; value: number };

// Every granular log (Investment/Savings/Superannuation/Stock Options) has
// the same shape — a few identifying fields plus a dollar Value — so one
// generic table drives add + inline edit for all four.
function EditableLogTable({
  id,
  title,
  fields,
  entries,
  dedupeKey,
  onAdd,
  onUpdate,
}: {
  id: string;
  title: string;
  fields: FieldSpec[];
  entries: LogRow[];
  // Identifies "the same thing" across re-logged entries (e.g. broker+ticker)
  // so the collapsed view can show just its latest value.
  dedupeKey: (entry: LogRow) => string;
  onAdd: (draft: Record<string, string | number>) => Promise<ActionResult>;
  onUpdate: (draft: Record<string, string | number> & { id: string }) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const latestEntries = useMemo(() => dedupeLatest(entries, dedupeKey), [entries, dedupeKey]);

  const visibleEntries = showAll ? entries : latestEntries;
  const hiddenCount = entries.length - latestEntries.length;

  const emptyDraft = (): Record<string, string | number> => {
    const draft: Record<string, string | number> = { value: 0 };
    for (const f of fields) draft[f.key] = f.type === "date" ? today() : "";
    return draft;
  };

  const [newDraft, setNewDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string | number> | null>(null);

  function run(action: () => Promise<ActionResult>, onSuccess: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onSuccess();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const datalistId = (key: string) => `dl-${id}-${key}`;
  const requiredFilled = fields.every((f) => f.type === "date" || String(newDraft[f.key] ?? "").trim() !== "");

  return (
    <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-bold text-lg text-ink">{title}</h3>
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="font-mono text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors"
          >
            {showAll ? "Show latest only" : `Show all (${entries.length})`}
          </button>
        )}
      </div>
      {error && (
        <div
          className="rounded-xl border px-4 py-2.5 text-sm"
          style={{ borderColor: "#CB3A1E", color: "#CB3A1E", background: "rgba(203,58,30,0.08)" }}
        >
          {error}
        </div>
      )}
      {fields
        .filter((f) => f.type === "select")
        .map((f) => (
          <datalist key={f.key} id={datalistId(f.key)}>
            {(f.options ?? []).map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        ))}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="border-b border-line">
              {[...fields.map((f) => f.label), "Value", ""].map((h, i, arr) => (
                <th
                  key={i}
                  className={`py-2 px-2 font-mono uppercase tracking-wide text-ink-soft font-normal whitespace-nowrap ${i === arr.length - 2 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((entry) => {
              const editing = editingId === entry.id;
              return (
                <tr key={entry.id} className="border-b border-line last:border-0">
                  {editing && editDraft ? (
                    <>
                      {fields.map((f) => (
                        <td key={f.key} className="py-1.5 px-2">
                          <input
                            type={f.type === "select" ? "text" : f.type}
                            list={f.type === "select" ? datalistId(f.key) : undefined}
                            value={editDraft[f.key]}
                            onChange={(e) => setEditDraft({ ...editDraft, [f.key]: e.target.value })}
                            className={`${inputCls} w-full`}
                          />
                        </td>
                      ))}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          value={editDraft.value}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (Number.isNaN(n)) return;
                            setEditDraft({ ...editDraft, value: n });
                          }}
                          className={`${inputCls} w-full text-right`}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap">
                        <button
                          onClick={() =>
                            run(
                              () => onUpdate({ id: entry.id, ...editDraft }),
                              () => {
                                setEditingId(null);
                                setEditDraft(null);
                              }
                            )
                          }
                          disabled={isPending}
                          className="font-mono text-xs px-2 py-1 rounded-full bg-ink text-paper mr-1 disabled:opacity-40"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft(null);
                          }}
                          className="font-mono text-xs px-2 py-1 rounded-full border border-line text-ink-soft"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      {fields.map((f) => (
                        <td key={f.key} className="py-1.5 px-2 font-mono text-ink">
                          {entry[f.key]}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-ink">{dollars(entry.value, 2)}</td>
                      <td className="py-1.5 px-2 text-right">
                        <button
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditDraft({ ...entry });
                          }}
                          className="font-mono text-xs px-2 py-1 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {/* Add new */}
            <tr>
              {fields.map((f) => (
                <td key={f.key} className="py-2 px-2">
                  <input
                    type={f.type === "select" ? "text" : f.type}
                    list={f.type === "select" ? datalistId(f.key) : undefined}
                    placeholder={f.type !== "date" ? f.label : undefined}
                    value={newDraft[f.key]}
                    onChange={(e) => setNewDraft({ ...newDraft, [f.key]: e.target.value })}
                    className={`${inputCls} w-full`}
                  />
                </td>
              ))}
              <td className="py-2 px-2">
                <input
                  type="number"
                  value={newDraft.value}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    if (Number.isNaN(n)) return;
                    setNewDraft({ ...newDraft, value: n });
                  }}
                  className={`${inputCls} w-full text-right`}
                />
              </td>
              <td className="py-2 px-2 text-right">
                <button
                  onClick={() => run(() => onAdd(newDraft), () => setNewDraft(emptyDraft()))}
                  disabled={isPending || !requiredFilled}
                  className="font-mono text-xs px-3 py-1.5 rounded-full bg-ink text-paper disabled:opacity-40"
                >
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Props = {
  assetGrowthLog: AssetGrowthEntry[];
  investmentLog: InvestmentLogEntry[];
  savingsLog: SavingsLogEntry[];
  superannuationLog: SuperannuationLogEntry[];
  stockOptionsLog: StockOptionsLogEntry[];
  brokerOptions: string[];
  tickerOptions: string[];
  bankOptions: string[];
  accountOptions: string[];
  providerOptions: string[];
  employerOptions: string[];
};

export default function AssetLogTab({
  assetGrowthLog,
  investmentLog,
  savingsLog,
  superannuationLog,
  stockOptionsLog,
  brokerOptions,
  tickerOptions,
  bankOptions,
  accountOptions,
  providerOptions,
  employerOptions,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Derived overview — read-only, nothing is edited here */}
      <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg text-ink">Asset Growth Log</h3>
          <div className="relative group">
            <span className="w-4 h-4 rounded-full bg-ink text-paper text-[10px] font-mono leading-none flex items-center justify-center cursor-help select-none shrink-0">
              ?
            </span>
            <div
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-soft leading-relaxed opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            >
              Derived automatically from the logs below, per month. Each investment/saving account/stock option counts
              at its latest known value, so re-logging one doesn't double it. Total Liquid Asset excludes
              Stock Options (illiquid, no ready market); Total Asset includes them. Edit those, not this.
            </div>
          </div>
        </div>
        {assetGrowthLog.length === 0 ? (
          <p className="text-sm text-ink-soft italic">
            No entries yet — log something in Investment, Savings, Superannuation or Stock Options below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="border-b border-line">
                  {[
                    "Month",
                    "Liquid Investment",
                    "Savings",
                    "Superannuation",
                    "Stock Options",
                    "Total Liquid Asset",
                    "Total Asset",
                  ].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`py-2 px-2 font-mono uppercase tracking-wide text-ink-soft font-normal whitespace-nowrap ${i === 0 ? "text-left" : "text-right"}`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {[...assetGrowthLog].reverse().map((e) => (
                  <tr key={e.month} className="border-b border-line last:border-0">
                    <td className="py-1.5 px-2 font-mono text-ink">{e.month}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink">{dollars(e.liquidInvestment, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink">{dollars(e.savings, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink">{dollars(e.superannuation, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink">{dollars(e.stockOptions, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-ink">{dollars(e.liquidAsset, 2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-ink">{dollars(e.asset, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditableLogTable
        id="investment"
        title="Investments Log"
        fields={[
          { key: "date", label: "Date", type: "date" },
          { key: "broker", label: "Broker", type: "select", options: brokerOptions },
          { key: "ticker", label: "Stock/ETF/Cash", type: "select", options: tickerOptions },
        ]}
        entries={investmentLog}
        dedupeKey={(e) => `${e.broker}|${e.ticker}`}
        onAdd={(d) => addInvestmentLogEntry(d as any)}
        onUpdate={(d) => updateInvestmentLogEntry(d as any)}
      />

      <EditableLogTable
        id="savings"
        title="Savings Log"
        fields={[
          { key: "date", label: "Date", type: "date" },
          { key: "bank", label: "Bank", type: "select", options: bankOptions },
          { key: "account", label: "Account", type: "select", options: accountOptions },
        ]}
        entries={savingsLog}
        dedupeKey={(e) => `${e.bank}|${e.account}`}
        onAdd={(d) => addSavingsLogEntry(d as any)}
        onUpdate={(d) => updateSavingsLogEntry(d as any)}
      />

      <EditableLogTable
        id="superannuation"
        title="Superannuation Log"
        fields={[
          { key: "date", label: "Date", type: "date" },
          { key: "provider", label: "Provider", type: "select", options: providerOptions },
        ]}
        entries={superannuationLog}
        dedupeKey={(e) => `${e.provider}`}
        onAdd={(d) => addSuperannuationLogEntry(d as any)}
        onUpdate={(d) => updateSuperannuationLogEntry(d as any)}
      />

      <EditableLogTable
        id="stock-options"
        title="Stock Options Log"
        fields={[
          { key: "date", label: "Date", type: "date" },
          { key: "employer", label: "Employer", type: "select", options: employerOptions },
          { key: "grant", label: "Grant", type: "text" },
        ]}
        entries={stockOptionsLog}
        dedupeKey={(e) => `${e.employer}|${e.grant}`}
        onAdd={(d) => addStockOptionsLogEntry(d as any)}
        onUpdate={(d) => updateStockOptionsLogEntry(d as any)}
      />
    </div>
  );
}
