import { getInvestmentLog } from "./getInvestmentLog";
import { getSavingsLog } from "./getSavingsLog";
import { getSuperannuationLog } from "./getSuperannuationLog";
import { getStockOptionsLog } from "./getStockOptionsLog";

export type AssetGrowthEntry = {
  month: string; // YYYY-MM — the only identifier; this table has no Notion rows of its own
  liquidInvestment: number;
  savings: number;
  superannuation: number;
  stockOptions: number;
  // Everything except Stock Options — those are illiquid (unvested/no ready
  // market), and the FI projection's own "Asset" was never modeling them
  // either, so this keeps the projected-vs-actual comparison apples-to-apples.
  liquidAsset: number; // liquidInvestment + savings + superannuation
};

// Rolls a granular log up into a per-month total, one holding/account/grant
// at a time: for each unique combo (e.g. broker+ticker), only its latest
// entry as-of a given month counts — logging the same combo twice in one
// month (a correction, a re-check) doesn't double it, and a combo you didn't
// touch this month keeps its last known value instead of dropping to zero
// or vanishing. `allMonths` should be the full month range across every
// granular log, so one log's silent months still get the others' carried-
// forward values.
export function carryForwardTotals<T extends { date: string; month: string; value: number }>(
  entries: T[],
  keyOf: (e: T) => string,
  allMonths: string[]
): Map<string, number> {
  const byKey = new Map<string, T[]>();
  for (const e of entries) {
    const k = keyOf(e);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(e);
  }
  for (const list of byKey.values()) list.sort((a, b) => a.date.localeCompare(b.date));

  const totals = new Map<string, number>(allMonths.map((m) => [m, 0]));

  for (const list of byKey.values()) {
    let idx = 0;
    let current = 0;
    for (const month of allMonths) {
      while (idx < list.length && list[idx].month <= month) {
        current = list[idx].value;
        idx++;
      }
      totals.set(month, (totals.get(month) ?? 0) + current);
    }
  }

  return totals;
}

// Purely derived — every edit happens at the granular level (Investment,
// Savings, Superannuation, Stock Options logs), each rolled up by month via
// carryForwardTotals and summed here. There's no Notion database backing
// this table directly.
export async function getAssetGrowthLog(): Promise<AssetGrowthEntry[]> {
  const [investment, savings, superannuation, stockOptions] = await Promise.all([
    getInvestmentLog(),
    getSavingsLog(),
    getSuperannuationLog(),
    getStockOptionsLog(),
  ]);

  const allMonths = [
    ...new Set([
      ...investment.map((e) => e.month),
      ...savings.map((e) => e.month),
      ...superannuation.map((e) => e.month),
      ...stockOptions.map((e) => e.month),
    ]),
  ].sort();

  const investmentTotals = carryForwardTotals(investment, (e) => `${e.broker}|${e.ticker}`, allMonths);
  const savingsTotals = carryForwardTotals(savings, (e) => `${e.bank}|${e.account}`, allMonths);
  const superTotals = carryForwardTotals(superannuation, (e) => e.provider, allMonths);
  const optionsTotals = carryForwardTotals(stockOptions, (e) => `${e.employer}|${e.grant}`, allMonths);

  return allMonths.map((month) => {
    const liquidInvestment = investmentTotals.get(month) ?? 0;
    const s = savingsTotals.get(month) ?? 0;
    const sup = superTotals.get(month) ?? 0;
    const so = optionsTotals.get(month) ?? 0;
    return {
      month,
      liquidInvestment,
      savings: s,
      superannuation: sup,
      stockOptions: so,
      liquidAsset: liquidInvestment + s + sup,
    };
  });
}
