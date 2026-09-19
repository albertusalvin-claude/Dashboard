import { connection } from "next/server";
import SpendingTab from "../../../../components/SpendingTab";
import {
  dummyShoppingList,
  dummyShoppingOptions,
  dummySpending,
  dummySpendingOptions,
} from "../../../../lib/dummyData";

export default async function DummySpendingPage() {
  await connection();

  const entries = dummySpending();

  // Same derivation as the real page, so the stat tiles agree with the rows.
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
      options={dummySpendingOptions()}
      shoppingItems={dummyShoppingList()}
      shoppingOptions={dummyShoppingOptions()}
      monthSpend={monthSpend}
      totalSpend={totalSpend}
      topCategory={topCategory}
    />
  );
}
