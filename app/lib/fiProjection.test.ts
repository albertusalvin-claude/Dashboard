import { describe, expect, it } from "vitest";
import { computeFIProjection, interpolateYearMonthly, MONTH_LABELS, type FIAssumptions } from "./fiProjection";

// Regression test: pins the model to a verified real-world snapshot (the
// dashboard's own "Money Projection Assumptions" table, screenshotted and
// eyeballed correct on 2026-09-05) so any future formula change gets caught
// unless it's deliberate. Given the exact same assumptions, computeFIProjection
// must always produce the exact same numbers.

const ASSUMPTIONS: FIAssumptions = {
  grossIncome: 109000,
  netIncome: 80000,
  startingInvestment: 45000,
  startingSaving: 30000,
  startingSuperannuation: 25000,
  mainSpending: 48000,
  tertiaryNeeds: 7000,
  investmentPct: 0.8,
  investmentReturn: 0.1,
  superReturn: 0.1,
  incomeGrowth: 0.08,
  inflation: 0.03,
  superRate: 0.12,
  depositReturn: 0.04,
  years: 18,
};

// [calendarYear, income, investment, saving, superannuation, spending, asset, investmentSpendingRatio]
const EXPECTED: [number, number, number, number, number, number, number, number][] = [
  [2026, 80000.0, 45000.0, 30000.0, 25000.0, 55000.0, 100000.0, 0.82],
  [2027, 86400.0, 69500.0, 36200.0, 37100.0, 56650.0, 142800.0, 1.23],
  [2028, 93312.0, 100250.0, 43598.0, 51178.0, 58349.5, 195026.0, 1.72],
  [2029, 100776.96, 138245.0, 52334.42, 67493.24, 60099.99, 258072.66, 2.3],
  [2030, 108839.12, 184611.08, 62563.19, 86335.8, 61902.98, 333510.07, 2.98],
  [2031, 117546.25, 240621.09, 74452.95, 108030.07, 63760.07, 423104.11, 3.77],
  [2032, 126949.95, 307712.14, 88188.3, 132938.63, 65672.88, 528839.07, 4.69],
  [2033, 137105.94, 387505.01, 103971.24, 161466.49, 67643.06, 652942.74, 5.73],
  [2034, 148074.42, 481825.81, 122022.67, 194065.85, 69672.35, 797914.33, 6.92],
  [2035, 159920.37, 592730.05, 142583.99, 231241.36, 71762.53, 966555.4, 8.26],
  [2036, 172714.0, 722529.33, 165918.92, 273555.94, 73915.4, 1162004.19, 9.78],
  [2037, 186531.12, 873821.14, 192315.39, 321637.22, 76132.86, 1387773.75, 11.48],
  [2038, 201453.61, 1049521.86, 222087.66, 376184.67, 78416.85, 1647794.19, 13.38],
  [2039, 217569.9, 1252903.45, 255578.52, 437977.57, 80769.35, 1946459.55, 15.51],
  [2040, 234975.49, 1487634.23, 293161.77, 507883.72, 83192.43, 2288679.72, 17.88],
  [2041, 253773.53, 1757824.1, 335244.85, 586869.15, 85688.21, 2679938.1, 20.51],
  [2042, 274075.41, 2068074.77, 382271.71, 676008.89, 88258.85, 3126355.37, 23.43],
  [2043, 296001.44, 2423535.49, 434725.89, 776498.83, 90906.62, 3634760.21, 26.66],
  [2044, 319681.56, 2829964.9, 493133.89, 889668.88, 93633.82, 4212767.67, 30.22],
];

describe("computeFIProjection", () => {
  const rows = computeFIProjection(ASSUMPTIONS);

  it("produces one row per year, 2026 through 2044", () => {
    expect(rows).toHaveLength(EXPECTED.length);
    expect(rows.map((r) => r.calendarYear)).toEqual(EXPECTED.map((e) => e[0]));
  });

  it.each(EXPECTED)(
    "matches the verified snapshot for %i",
    (calendarYear, income, investment, saving, superannuation, spending, asset, investmentSpendingRatio) => {
      const row = rows.find((r) => r.calendarYear === calendarYear)!;
      expect(row.income).toBeCloseTo(income, 2);
      expect(row.investment).toBeCloseTo(investment, 2);
      expect(row.saving).toBeCloseTo(saving, 2);
      expect(row.superannuation).toBeCloseTo(superannuation, 2);
      expect(row.spending).toBeCloseTo(spending, 2);
      expect(row.asset).toBeCloseTo(asset, 2);
      expect(row.investmentSpendingRatio).toBeCloseTo(investmentSpendingRatio, 2);
      // Asset is defined as the sum of the three balances — always, not just here.
      expect(row.asset).toBeCloseTo(row.investment + row.saving + row.superannuation, 6);
    }
  );

  it("pins year 0 to the sum of the starting balances", () => {
    const year0 = rows[0];
    expect(year0.asset).toBeCloseTo(
      ASSUMPTIONS.startingInvestment + ASSUMPTIONS.startingSaving + ASSUMPTIONS.startingSuperannuation,
      6
    );
  });
});

describe("interpolateYearMonthly", () => {
  const rows = computeFIProjection(ASSUMPTIONS);

  it("returns 12 months, Jan through Dec, for a year with a following year", () => {
    const months = interpolateYearMonthly(rows, 2026);
    expect(months).toHaveLength(12);
    expect(months.map((m) => m.monthLabel)).toEqual([...MONTH_LABELS]);
    expect(months.map((m) => m.monthIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(months.every((m) => m.calendarYear === 2026)).toBe(true);
  });

  it("Jan matches the year's own row exactly — interpolation starts at t=0", () => {
    const jan2027 = interpolateYearMonthly(rows, 2027)[0];
    const year2027 = rows.find((r) => r.calendarYear === 2027)!;
    expect(jan2027.investment).toBeCloseTo(year2027.investment, 6);
    expect(jan2027.saving).toBeCloseTo(year2027.saving, 6);
    expect(jan2027.superannuation).toBeCloseTo(year2027.superannuation, 6);
    expect(jan2027.income).toBeCloseTo(year2027.income, 6);
    expect(jan2027.spending).toBeCloseTo(year2027.spending, 6);
    expect(jan2027.asset).toBeCloseTo(year2027.asset, 6);
  });

  it("mid-year is the geometric mean of this year's and next year's values", () => {
    const year2026 = rows.find((r) => r.calendarYear === 2026)!;
    const year2027 = rows.find((r) => r.calendarYear === 2027)!;
    const july = interpolateYearMonthly(rows, 2026)[6]; // t = 6/12 = 0.5
    expect(july.investment).toBeCloseTo(Math.sqrt(year2026.investment * year2027.investment), 6);
    expect(july.superannuation).toBeCloseTo(Math.sqrt(year2026.superannuation * year2027.superannuation), 6);
  });

  it("holds flat across all 12 months for the last projected year (no following year to interpolate toward)", () => {
    const lastYear = rows[rows.length - 1];
    const months = interpolateYearMonthly(rows, lastYear.calendarYear);
    for (const m of months) {
      expect(m.investment).toBeCloseTo(lastYear.investment, 6);
      expect(m.asset).toBeCloseTo(lastYear.asset, 6);
    }
  });

  it("recomputes the ratio fields from investment/asset and spending, not by interpolating the ratio itself", () => {
    const months = interpolateYearMonthly(rows, 2026);
    for (const m of months) {
      expect(m.investmentSpendingRatio).toBeCloseTo(m.investment / m.spending, 6);
      expect(m.assetSpendingRatio).toBeCloseTo(m.asset / m.spending, 6);
    }
  });

  it("holds Income and Spending flat at this year's value — they're annual flow totals, not balances, so they don't creep toward next year's figure", () => {
    const year2026 = rows.find((r) => r.calendarYear === 2026)!;
    const months = interpolateYearMonthly(rows, 2026);
    for (const m of months) {
      expect(m.income).toBe(year2026.income);
      expect(m.spending).toBe(year2026.spending);
    }
  });

  it("Asset always equals the sum of the three balances, even mid-year — it's never interpolated on its own (that would drift from the identity, since interpolating a sum isn't the same as summing three independent interpolations)", () => {
    const months = interpolateYearMonthly(rows, 2026);
    for (const m of months) {
      expect(m.asset).toBeCloseTo(m.investment + m.saving + m.superannuation, 9);
    }
  });

  it("returns an empty array for a calendar year outside the projection", () => {
    expect(interpolateYearMonthly(rows, 1999)).toEqual([]);
  });
});

// Ground truth: the app's own rendered Monthly Projection table for 2026,
// screenshotted twice (before/after an unrelated UI tweak) with identical
// numbers both times — confirms these are what the app actually produced,
// not a one-off. Investment/Saving/Superannuation are pinned verbatim from
// the screenshots; Liquid Asset's expected value is their sum computed once
// here (not re-transcribed from the screenshot's — buggy, at the time —
// independently-interpolated Liquid Asset column), then asserted against
// `m.asset` as its own explicit value, plus separately against the
// identity, so a regression in either the number or the definition fails.
describe("interpolateYearMonthly — pinned to a real rendered snapshot (2026)", () => {
  const rows = computeFIProjection(ASSUMPTIONS);
  const months = interpolateYearMonthly(rows, 2026);

  // [monthLabel, investment, saving, superannuation]
  const SNAPSHOT: [string, number, number, number][] = [
    ["Jan", 45000.0, 30000.0, 25000.0],
    ["Feb", 46659.87, 30473.35, 25836.05],
    ["Mar", 48380.97, 30954.17, 26700.07],
    ["Apr", 50165.55, 31442.57, 27592.97],
    ["May", 52015.96, 31938.68, 28515.74],
    ["Jun", 53934.62, 32442.62, 29469.37],
    ["Jul", 55924.06, 32954.51, 30454.88],
    ["Aug", 57986.87, 33474.48, 31473.36],
    ["Sep", 60125.78, 34002.65, 32525.9],
    ["Oct", 62343.58, 34539.16, 33613.63],
    ["Nov", 64643.19, 35084.13, 34737.74],
    ["Dec", 67027.62, 35637.7, 35899.45],
  ];

  // [monthLabel, expected Liquid Asset] — investment + saving + superannuation
  // for the row above, computed once and pinned as its own number.
  const LIQUID_ASSET: [string, number][] = SNAPSHOT.map(([monthLabel, investment, saving, superannuation]) => [
    monthLabel,
    investment + saving + superannuation,
  ]);

  it.each(SNAPSHOT)("matches the rendered snapshot for %s", (monthLabel, investment, saving, superannuation) => {
    const m = months.find((r) => r.monthLabel === monthLabel)!;
    expect(m.investment).toBeCloseTo(investment, 1);
    expect(m.saving).toBeCloseTo(saving, 1);
    expect(m.superannuation).toBeCloseTo(superannuation, 1);
  });

  it.each(LIQUID_ASSET)("Liquid Asset for %s matches Investment + Saving + Superannuation", (monthLabel, expected) => {
    const m = months.find((r) => r.monthLabel === monthLabel)!;
    expect(m.asset).toBeCloseTo(expected, 1);
  });

  it("Income and Spending are static all year — $80,000 and $55,000, this year's own values", () => {
    for (const m of months) {
      expect(m.income).toBe(80000);
      expect(m.spending).toBe(55000);
    }
  });
});
