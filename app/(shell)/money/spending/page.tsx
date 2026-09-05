import SpendingTab from "../../../components/SpendingTab";
import { getSpending } from "../../../lib/getSpending";
import { getShoppingList } from "../../../lib/getShoppingList";

export default async function SpendingPage() {
  const [entries, shoppingItems] = await Promise.all([getSpending(), getShoppingList()]);

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
    <SpendingTab
      entries={entries}
      shoppingItems={shoppingItems}
      monthSpend={monthSpend}
      totalSpend={totalSpend}
      topCategory={topCategory}
    />
  );
}
