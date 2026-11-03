"use client";

import { useState } from "react";
import SpendingEntryForm from "./SpendingEntryForm";
import SpendingTimeline from "./SpendingTimeline";
import ShoppingList from "./ShoppingList";
import SpendingBreakdown from "./SpendingBreakdown";
import { chipCls } from "./ProjectBar";
import { GENERAL, inProject, isGeneral, spendingProjects } from "../lib/spending";
import type { SpendingEntry } from "../api/spending/route";
import type { ShoppingItem } from "../lib/getShoppingList";
import type { SpendingClassifications } from "../lib/getSpendingClassifications";
import type { ShoppingOptions } from "../lib/getShoppingOptions";

type Props = {
  entries: SpendingEntry[];
  classifications: SpendingClassifications;
  shoppingOptions: ShoppingOptions;
  shoppingItems: ShoppingItem[];
  monthSpend: number;
  totalSpend: number;
  topCategory: string;
};

export default function SpendingTab({
  entries,
  classifications,
  shoppingItems,
  shoppingOptions,
  monthSpend,
  totalSpend,
  topCategory,
}: Props) {
  const [adding, setAdding] = useState(false);
  // Null is All. The chips narrow everything in the Spending section.
  const [project, setProject] = useState<string | null>(null);

  // The reason why we have deduped union of options and projects is because some of the options are empty(newly created)
  // We still want to show those newly created options regardless.
  const projects = spendingProjects(classifications.projects, entries);
  const hasGeneral = entries.some((e) => isGeneral(e.project));
  const toShow = entries.filter((e) => inProject(e, project));

  // With one project picked, slicing by project would be a single slice.
  const canSliceByProject = projects.length > 0 && project === null;

  // Suggestions for the free-text Store field, from every entry, not just
  // the project picked.
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

      <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display font-bold text-lg text-ink">Spending</h3>
          <button
            onClick={() => setAdding((open) => !open)}
            className="font-mono text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            + Add entry
          </button>
        </div>

        {adding && (
          <SpendingEntryForm
            classifications={classifications}
            storeSuggestions={storeSuggestions}
            onClose={() => setAdding(false)}
          />
        )}

        {projects.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[null, ...projects, ...(hasGeneral ? [GENERAL] : [])].map((p) => (
              <button key={p ?? "All"} onClick={() => setProject(p)} className={chipCls(project === p)}>
                {p ?? "All"}
              </button>
            ))}
          </div>
        )}

        <SpendingBreakdown entries={toShow} title="Spending" canSliceByProject={canSliceByProject} />
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center justify-between py-2 select-none border-t border-line pt-4">
            <span className="font-mono text-xs text-ink-soft uppercase tracking-wide">Timeline</span>
            <span className="font-mono text-xs text-ink-soft group-open:hidden">Show ▾</span>
            <span className="font-mono text-xs text-ink-soft hidden group-open:inline">Hide ▴</span>
          </summary>
          <div className="mt-3">
            <SpendingTimeline entries={toShow} classifications={classifications} storeSuggestions={storeSuggestions} />
          </div>
        </details>
      </div>

      <ShoppingList items={shoppingItems} options={shoppingOptions} />
    </div>
  );
}
