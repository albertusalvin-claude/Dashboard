import { describe, expect, it } from "vitest";
import { dedupeLatest } from "./dedupeLatest";
import { computeAssetGrowthLog } from "./getAssetGrowthLog";
import type { InvestmentLogEntry } from "./getInvestmentLog";
import type { SavingsLogEntry } from "./getSavingsLog";
import type { SuperannuationLogEntry } from "./getSuperannuationLog";
import type { StockOptionsLogEntry } from "./getStockOptionsLog";

// Real data pulled from the live /money/logs page on 2026-09-07 (via the
// Next.js RSC payload), used verbatim as a regression fixture — this is
// what the app was actually showing, not a hand-built synthetic case.
// Investment has 4 combos re-logged Sept over Jan (one, IBKR/Cash, brand
// new in Sept); Savings has 3 accounts in Sept vs. 2 in Jan (High Interest
// Savings didn't exist yet); Superannuation and Stock Options each have a
// single combo logged twice.

const investmentLog: InvestmentLogEntry[] = [
  { id: "inv-1", date: "2026-09-07", month: "2026-09", broker: "IBKR", ticker: "Cash", value: 2920 },
  { id: "inv-2", date: "2026-09-07", month: "2026-09", broker: "IBKR", ticker: "VOO", value: 7805 },
  { id: "inv-3", date: "2026-09-07", month: "2026-09", broker: "IBKR", ticker: "VGS", value: 16806 },
  { id: "inv-4", date: "2026-09-07", month: "2026-09", broker: "IBKR", ticker: "QQQ", value: 26251 },
  { id: "inv-5", date: "2026-01-01", month: "2026-01", broker: "IBKR", ticker: "VOO", value: 6800 },
  { id: "inv-6", date: "2026-01-01", month: "2026-01", broker: "IBKR", ticker: "VGS", value: 15800 },
  { id: "inv-7", date: "2026-01-01", month: "2026-01", broker: "IBKR", ticker: "QQQ", value: 25000 },
];

const savingsLog: SavingsLogEntry[] = [
  { id: "sav-1", date: "2026-09-07", month: "2026-09", bank: "Commonwealth", account: "Smart Access", value: 1694 },
  {
    id: "sav-2",
    date: "2026-09-07",
    month: "2026-09",
    bank: "Commonwealth",
    account: "High Interest Savings",
    value: 37684,
  },
  {
    id: "sav-3",
    date: "2026-09-07",
    month: "2026-09",
    bank: "Commonwealth",
    account: "Constant Interest Savings",
    value: 20511,
  },
  { id: "sav-4", date: "2026-01-01", month: "2026-01", bank: "Commonwealth", account: "Smart Access", value: 193 },
  {
    id: "sav-5",
    date: "2026-01-01",
    month: "2026-01",
    bank: "Commonwealth",
    account: "Constant Interest Savings",
    value: 32316,
  },
];

const superannuationLog: SuperannuationLogEntry[] = [
  { id: "sup-1", date: "2026-09-07", month: "2026-09", provider: "UniSuper", value: 36076 },
  { id: "sup-2", date: "2026-01-01", month: "2026-01", provider: "UniSuper", value: 25446 },
];

const stockOptionsLog: StockOptionsLogEntry[] = [
  { id: "opt-1", date: "2026-09-07", month: "2026-09", employer: "Neara", grant: "2600", value: 100000 },
  { id: "opt-2", date: "2026-01-01", month: "2026-01", employer: "Neara", grant: "2600", value: 100000 },
];

describe("dedupeLatest — real per-log data", () => {
  it("Investments Log: keeps only the 4 September rows (Jan re-logs of the same broker/ticker drop out)", () => {
    const result = dedupeLatest(investmentLog, (e) => `${e.broker}|${e.ticker}`);
    expect(result.map((e) => e.id)).toEqual(["inv-1", "inv-2", "inv-3", "inv-4"]);
  });

  it("Savings Log: keeps only the 3 September rows (Jan re-logs of the same bank/account drop out)", () => {
    const result = dedupeLatest(savingsLog, (e) => `${e.bank}|${e.account}`);
    expect(result.map((e) => e.id)).toEqual(["sav-1", "sav-2", "sav-3"]);
  });

  it("Superannuation Log: keeps only the September UniSuper row", () => {
    const result = dedupeLatest(superannuationLog, (e) => e.provider);
    expect(result.map((e) => e.id)).toEqual(["sup-1"]);
  });

  it("Stock Options Log: keeps only the September Neara/2600 row", () => {
    const result = dedupeLatest(stockOptionsLog, (e) => `${e.employer}|${e.grant}`);
    expect(result.map((e) => e.id)).toEqual(["opt-1"]);
  });
});

describe("computeAssetGrowthLog — real fixture", () => {
  const rows = computeAssetGrowthLog(investmentLog, savingsLog, superannuationLog, stockOptionsLog);

  it("produces exactly the two months actually shown on the live page", () => {
    expect(rows.map((r) => r.month)).toEqual(["2026-01", "2026-09"]);
  });

  it("matches January's real rendered totals — High Interest Savings hadn't started yet", () => {
    const jan = rows.find((r) => r.month === "2026-01")!;
    expect(jan.liquidInvestment).toBe(47600); // 6800 + 15800 + 25000 (no Cash combo yet)
    expect(jan.savings).toBe(32509); // 193 + 32316 (no High Interest Savings yet)
    expect(jan.superannuation).toBe(25446);
    expect(jan.stockOptions).toBe(100000);
    expect(jan.liquidAsset).toBe(105555); // excludes the 100000 stock options
    expect(jan.asset).toBe(205555); // includes it
  });

  it("matches September's real rendered totals", () => {
    const sep = rows.find((r) => r.month === "2026-09")!;
    expect(sep.liquidInvestment).toBe(53782); // 2920 + 7805 + 16806 + 26251
    expect(sep.savings).toBe(59889); // 1694 + 37684 + 20511
    expect(sep.superannuation).toBe(36076);
    expect(sep.stockOptions).toBe(100000);
    expect(sep.liquidAsset).toBe(149747);
    expect(sep.asset).toBe(249747);
  });
});
