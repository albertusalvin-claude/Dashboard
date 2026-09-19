import { describe, expect, it } from "vitest";
import {
  dummyAssetGrowthLog,
  dummyFIAssumptions,
  dummyInvestmentLog,
  dummySavingsLog,
  dummyStockOptionsLog,
  dummySuperannuationLog,
} from "./dummyData";

// The demo is only convincing if its numbers agree with each other: the Asset
// Growth Log on /dummy/money/logs is rolled up from the granular logs shown
// directly beneath it, so anyone adding them up by hand gets the same answer.
describe("dummy asset data", () => {
  const growth = dummyAssetGrowthLog();
  const latestMonth = growth.at(-1)!;

  function latestValues<T extends { month: string; value: number }>(entries: T[], keyOf: (e: T) => string) {
    const byKey = new Map<string, T>();
    for (const entry of entries) {
      const current = byKey.get(keyOf(entry));
      if (!current || entry.month > current.month) byKey.set(keyOf(entry), entry);
    }
    return [...byKey.values()].reduce((sum, e) => sum + e.value, 0);
  }

  it("covers every month the granular logs do", () => {
    const months = [...new Set(dummyInvestmentLog().map((e) => e.month))].sort();
    expect(growth.map((row) => row.month)).toEqual(months);
    expect(growth.length).toBeGreaterThan(1);
  });

  it("totals the granular logs rather than carrying its own numbers", () => {
    expect(latestMonth.liquidInvestment).toBe(
      latestValues(dummyInvestmentLog(), (e) => `${e.broker}|${e.ticker}`)
    );
    expect(latestMonth.savings).toBe(latestValues(dummySavingsLog(), (e) => `${e.bank}|${e.account}`));
    expect(latestMonth.superannuation).toBe(latestValues(dummySuperannuationLog(), (e) => e.provider));
    expect(latestMonth.stockOptions).toBe(
      latestValues(dummyStockOptionsLog(), (e) => `${e.employer}|${e.grant}`)
    );
  });

  it("keeps liquid and total asset consistent with their parts", () => {
    for (const row of growth) {
      expect(row.liquidAsset).toBe(row.liquidInvestment + row.savings + row.superannuation);
      expect(row.asset).toBe(row.liquidAsset + row.stockOptions);
    }
  });

  it("starts the projection from where the logs ended up", () => {
    const assumptions = dummyFIAssumptions();
    expect(assumptions.startingInvestment).toBe(latestMonth.liquidInvestment);
    expect(assumptions.startingSaving).toBe(latestMonth.savings);
    expect(assumptions.startingSuperannuation).toBe(latestMonth.superannuation);
  });

  it("is stable between calls, so the demo doesn't reshuffle on refresh", () => {
    expect(dummyAssetGrowthLog()).toEqual(growth);
  });

  it("does not look generated — no suspiciously round starting values", () => {
    const starts = growth[0];
    for (const value of [starts.liquidInvestment, starts.savings, starts.superannuation]) {
      expect(value % 500).not.toBe(0);
    }
  });
});
