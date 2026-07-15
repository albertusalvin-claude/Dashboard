import SpendingTimeline from "./SpendingTimeline";
import ShoppingList from "./ShoppingList";
import SpendingBreakdown from "./SpendingBreakdown";
import type { SpendingEntry } from "../api/spending/route";
import type { ShoppingItem } from "../lib/getShoppingList";

type Props = {
  entries: SpendingEntry[];
  shoppingItems: ShoppingItem[];
  monthSpend: number;
  totalSpend: number;
  topCategory: string;
};

export default function MoneyTab({ entries, shoppingItems, monthSpend, totalSpend, topCategory }: Props) {
  const groceries = entries.filter((e) => e.category === "Groceries");
  const oneOff = entries.filter((e) => e.category !== "Groceries");

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
        <h3 className="font-display font-bold text-lg text-ink">One-off Spending</h3>
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
            <SpendingTimeline entries={oneOff} />
          </div>
        </details>
      </div>

      {/* Groceries */}
      <div className="bg-card rounded-2xl border border-line p-5 space-y-4">
        <h3 className="font-display font-bold text-lg text-ink">Groceries</h3>
        <SpendingBreakdown
          entries={groceries}
          title="Groceries"
          pieKey={(e) => e.store}
          pieLabel="store"
        />
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center justify-between py-2 select-none border-t border-line pt-4">
            <span className="font-mono text-xs text-ink-soft uppercase tracking-wide">Timeline</span>
            <span className="font-mono text-xs text-ink-soft group-open:hidden">Show ▾</span>
            <span className="font-mono text-xs text-ink-soft hidden group-open:inline">Hide ▴</span>
          </summary>
          <div className="mt-3">
            <SpendingTimeline entries={groceries} />
          </div>
        </details>
      </div>

      <ShoppingList items={shoppingItems} />
    </div>
  );
}
