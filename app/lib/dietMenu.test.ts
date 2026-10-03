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
  it("adds a smoothie up from its ingredient lines", () => {
    const totals = smoothieTotals(
      parseSmoothieIngredients("Oats | ½ cup | 0.30 | 150 | 5.0 | 2.5 | 27 | 4\nMilk | 1 cup | 0.45 | 122 | 8.1 | 4.8 | 11.7 | 0\nWater | 1 cup | 0")
    );
    expect(totals.kcal).toBe(272);
    expect(totals.cost).toBeCloseTo(0.75);
    expect(totals.protein).toBe(13.1);
  });

  it("divides a batch into per-serve cost", () => {
    const dish = { costItems: parseCostLines("Chicken | 9.00\nRice | 1.60\nOil | 0.40"), portions: 5 };
    expect(batchCost(dish).total).toBeCloseTo(11);
    expect(batchCost(dish).perServe).toBeCloseTo(2.2);
    expect(batchCost({ ...dish, portions: null }).perServe).toBeNull();
  });

  it("reads the Type select by label, falling back to veg", () => {
    expect(dishTypeFromLabel("Fish / egg")).toBe("egg");
    expect(dishTypeFromLabel("beef")).toBe("beef");
    expect(dishTypeFromLabel("")).toBe("veg");
  });
});
