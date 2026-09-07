import { describe, expect, it } from "vitest";
import { carryForwardTotals } from "./getAssetGrowthLog";

type Row = { date: string; month: string; value: number; key: string };

const row = (date: string, key: string, value: number): Row => ({ date, month: date.slice(0, 7), key, value });

describe("carryForwardTotals", () => {
  it("re-logging the same combo within a month doesn't double it", () => {
    const entries = [row("2026-09-01", "ibkr|vgs", 5000), row("2026-09-15", "ibkr|vgs", 5200)];
    const totals = carryForwardTotals(entries, (e) => e.key, ["2026-09"]);
    expect(totals.get("2026-09")).toBe(5200); // the later re-check, not 5000+5200
  });

  it("carries a combo's last known value into months it wasn't re-logged", () => {
    const entries = [row("2026-07-01", "aware-super", 25000)];
    const totals = carryForwardTotals(entries, (e) => e.key, ["2026-07", "2026-08", "2026-09"]);
    expect(totals.get("2026-07")).toBe(25000);
    expect(totals.get("2026-08")).toBe(25000);
    expect(totals.get("2026-09")).toBe(25000);
  });

  it("a combo contributes zero to months before it was ever logged", () => {
    const entries = [row("2026-09-01", "commsec|vas", 3000)];
    const totals = carryForwardTotals(entries, (e) => e.key, ["2026-07", "2026-08", "2026-09"]);
    expect(totals.get("2026-07")).toBe(0);
    expect(totals.get("2026-08")).toBe(0);
    expect(totals.get("2026-09")).toBe(3000);
  });

  it("sums distinct combos rather than collapsing them", () => {
    const entries = [row("2026-09-01", "ibkr|vgs", 5000), row("2026-09-01", "commsec|vas", 3000)];
    const totals = carryForwardTotals(entries, (e) => e.key, ["2026-09"]);
    expect(totals.get("2026-09")).toBe(8000);
  });

  it("mixes carry-forward and fresh updates across combos in the same month", () => {
    const entries = [
      row("2026-07-01", "ibkr|vgs", 5000),
      row("2026-08-01", "commsec|vas", 3000),
      row("2026-09-01", "ibkr|vgs", 5500), // updated again
    ];
    const totals = carryForwardTotals(entries, (e) => e.key, ["2026-07", "2026-08", "2026-09"]);
    expect(totals.get("2026-07")).toBe(5000); // vgs only
    expect(totals.get("2026-08")).toBe(5000 + 3000); // vgs carried + vas new
    expect(totals.get("2026-09")).toBe(5500 + 3000); // vgs updated + vas carried
  });
});
