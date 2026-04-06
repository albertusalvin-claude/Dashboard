import SpendingChart from "./components/SpendingChart";
import SpendingTimeline from "./components/SpendingTimeline";
import ShoppingList from "./components/ShoppingList";
import { getSpending } from "./lib/getSpending";
import { getShoppingList } from "./lib/getShoppingList";

export default async function Home() {
  const [entries, shoppingItems] = await Promise.all([getSpending(), getShoppingList()]);

  const totalSpend = entries.reduce((sum, e) => sum + e.amount, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthSpend = entries
    .filter((e) => e.date.startsWith(thisMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const categoryMap: Record<string, number> = {};
  for (const e of entries) {
    categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount;
  }
  const topCategory = Object.entries(categoryMap).sort(([, a], [, b]) => b - a)[0];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Spending Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Synced from Notion</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">This Month</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">${monthSpend.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">All Time</p>
            <p className="text-xl font-bold text-gray-800 mt-1">${totalSpend.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Top Category</p>
            <p className="text-xl font-bold text-gray-800 mt-1 truncate">
              {topCategory ? topCategory[0] : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SpendingChart entries={entries} />
          <ShoppingList items={shoppingItems} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-4">Timeline</h2>
          <SpendingTimeline entries={entries} />
        </div>
      </div>
    </main>
  );
}
