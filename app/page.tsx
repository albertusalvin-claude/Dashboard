import { getSpending } from "./lib/getSpending";
import { getShoppingList } from "./lib/getShoppingList";
import { getWeightLog } from "./lib/getWeightLog";
import { getBPLog } from "./lib/getBPLog";
import Dashboard from "./components/Dashboard";

export default async function Home() {
  const [entries, shoppingItems, weightLog, bpLog] = await Promise.all([
    getSpending(),
    getShoppingList(),
    getWeightLog(),
    getBPLog(),
  ]);

  // Compute date-sensitive stats on the server so client hydration always matches.
  const thisMonth = new Date().toISOString().slice(0, 7);
  const totalSpend = entries.reduce((sum, e) => sum + e.amount, 0);
  const monthSpend = entries
    .filter((e) => e.date.startsWith(thisMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const categoryMap: Record<string, number> = {};
  for (const e of entries) {
    categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount;
  }
  const topCategory = Object.entries(categoryMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";

  return (
    <Dashboard
      entries={entries}
      shoppingItems={shoppingItems}
      monthSpend={monthSpend}
      totalSpend={totalSpend}
      topCategory={topCategory}
      weightLog={weightLog}
      bpLog={bpLog}
    />
  );
}
