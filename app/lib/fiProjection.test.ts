import { describe, expect, it } from "vitest";
import { computeFIProjection, type FIAssumptions } from "./fiProjection";

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
