import { describe, expect, it } from "vitest";
import {
  batchCost,
  dishTypeFromLabel,
  formatCostLines,
  formatSmoothieIngredients,
  parseCostLines,
  parseSmoothieIngredients,
  smoothieTotals,
} from "./dietMenu";
import { dummyMealPrep, dummySmoothies } from "./dummyData";

// The ingredient and cost tables are stored as " | "-separated lines in a
// Notion Text property, and may be hand-edited there — so the parser has to
// tolerate what a person types, and a save must read back exactly.
describe("diet menu text tables", () => {
  it("round-trips smoothie ingredients", () => {
    const rows = dummySmoothies()[0].ingredients;
    expect(parseSmoothieIngredients(formatSmoothieIngredients(rows))).toEqual(rows);
  });

  it("round-trips cost lines", () => {
    const rows = dummyMealPrep()[0].costItems;
    expect(parseCostLines(formatCostLines(rows))).toEqual(rows);
  });

  it("tolerates dollar signs, blank lines, missing cells and stray spacing", () => {
    expect(parseCostLines("Garlic |  $1.05\n\n  Ginger|1\nSalt |\nMystery | lots")).toEqual([
      { ingredient: "Garlic", cost: 1.05 },
      { ingredient: "Ginger", cost: 1 },
      { ingredient: "Salt", cost: null },
      { ingredient: "Mystery", cost: null },
    ]);
  });

  it("drops rows without a name when saving", () => {
    expect(formatCostLines([{ ingredient: "  ", cost: 2 }, { ingredient: "Oil", cost: null }])).toBe("Oil | ");
  });
});

describe("diet menu totals", () => {
  it("adds the smoothie up to the figures the tab used to hard-code", () => {
    const totals = smoothieTotals(dummySmoothies()[0].ingredients);
    expect(totals.kcal).toBe(485);
    expect(totals.cost).toBeCloseTo(5.05);
    expect(totals.protein).toBe(17.3);
  });

  it("divides a batch into per-serve cost", () => {
    const capcai = dummyMealPrep()[0];
    expect(batchCost(capcai).total).toBeCloseTo(17.86);
    expect(batchCost(capcai).perServe).toBeCloseTo(3.572);
    expect(batchCost({ ...capcai, portions: null }).perServe).toBeNull();
  });

  it("reads the Type select by label, falling back to veg", () => {
    expect(dishTypeFromLabel("Fish / egg")).toBe("egg");
    expect(dishTypeFromLabel("beef")).toBe("beef");
    expect(dishTypeFromLabel("")).toBe("veg");
  });
});
