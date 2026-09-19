"use client";

import { useState } from "react";
import SpendingEntryForm from "./SpendingEntryForm";
import SpendingTimeline from "./SpendingTimeline";
import ShoppingList from "./ShoppingList";
import SpendingBreakdown from "./SpendingBreakdown";
import type { SpendingEntry } from "../api/spending/route";
import type { ShoppingItem } from "../lib/getShoppingList";
import type { SpendingOptions } from "../lib/getSpendingOptions";
import type { ShoppingOptions } from "../lib/getShoppingOptions";

type Props = {
  entries: SpendingEntry[];
  options: SpendingOptions;
  shoppingOptions: ShoppingOptions;
  shoppingItems: ShoppingItem[];
  monthSpend: number;
  totalSpend: number;
  topCategory: string;
};

export default function SpendingTab({
  entries,
  options,
  shoppingItems,
  shoppingOptions,
  monthSpend,
  totalSpend,
  topCategory,
}: Props) {
  const oneOff = entries.filter((e) => e.category !== "Groceries");
  const [adding, setAdding] = useState(false);

  // Suggestions for the free-text Store field, drawn from every entry rather
  // than just the one-off ones shown in the timeline.
  const storeSuggestions = [...new Set(entries.map((e) => e.store).filter(Boolean))].sort();

  const stats = [
    { label: "This Month", value: `$${monthSpend.toFixed(2)}`, color: "#CB3A1E" },
    { label: "All Time", value: `$${totalSpend.toFixed(2)}`, color: "#4E7043" },
    { label: "Top Category", value: topCategory, color: "#B4832A" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-2xl border border-line p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: color }} />
            <p className="text-xs text-ink-soft font-medium uppercase tracking-wide pl-3">{label}</p>
            <p className="font-mono font-bold text-xl text-ink mt-1.5 pl-3 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* One-off Spending */}
      <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display font-bold text-lg text-ink">One-off Spending</h3>
          <button
            onClick={() => setAdding((open) => !open)}
            className="font-mono text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            + Add entry
          </button>
        </div>

        {adding && (
          <SpendingEntryForm
            options={options}
            storeSuggestions={storeSuggestions}
            onClose={() => setAdding(false)}
          />
        )}

        <SpendingBreakdown
          entries={oneOff}
          title="One-off Spending"
          pieKey={(e) => e.category}
          pieLabel="category"
        />
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center justify-between py-2 select-none border-t border-line pt-4">
            <span className="font-mono text-xs text-ink-soft uppercase tracking-wide">Timeline</span>
            <span className="font-mono text-xs text-ink-soft group-open:hidden">Show ▾</span>
            <span className="font-mono text-xs text-ink-soft hidden group-open:inline">Hide ▴</span>
          </summary>
          <div className="mt-3">
            <SpendingTimeline entries={oneOff} options={options} storeSuggestions={storeSuggestions} />
          </div>
        </details>
      </div>

      <ShoppingList items={shoppingItems} options={shoppingOptions} />
    </div>
  );
}
