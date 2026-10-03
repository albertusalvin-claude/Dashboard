// Shapes and text formats for the Diet tab's editable menu — the Smoothies,
// Meal Prep and One-off Dishes Notion databases. Pure, so both the server (reading/writing Notion)
// and the client (forms, totals) can use it.

// Meal prep and one-off dishes share one shape, each in its own database.
export type DishMenuKind = "mealPrep" | "oneOff";

export const DISH_MENU_ENV: Record<DishMenuKind, string> = {
  mealPrep: "NOTION_MEAL_PREP_ID",
  oneOff: "NOTION_ONE_OFF_ID",
};

export type DishType = "veg" | "beef" | "carb" | "egg";

export const DISH_TYPES: DishType[] = ["veg", "beef", "carb", "egg"];

// What the Type Select reads as in Notion. Matched case-insensitively on read.
export const DISH_TYPE_LABEL: Record<DishType, string> = {
  veg: "Veg",
  beef: "Beef",
  carb: "Carb",
  egg: "Fish / egg",
};

export const DISH_BORDER: Record<DishType, string> = {
  veg: "#4E7043",
  beef: "#CB3A1E",
  carb: "#B4832A",
  egg: "#403A7A",
};

export function dishTypeFromLabel(label: string): DishType {
  const wanted = label.trim().toLowerCase();
  return DISH_TYPES.find((t) => DISH_TYPE_LABEL[t].toLowerCase() === wanted || t === wanted) ?? "veg";
}

export type SmoothieIngredient = {
  name: string;
  perServe: string;
  cost: number | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
};

export type Smoothie = {
  id: string;
  name: string;
  order: number;
  description: string;
  ingredients: SmoothieIngredient[];
  costNote: string;
  nutritionNote: string;
};

export type CostLine = { ingredient: string; cost: number | null };

export type DishNutrition = {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
};

export type Dish = {
  id: string;
  name: string;
  order: number;
  type: DishType;
  notes: string;
  /** Portions per batch — divides the batch cost into a per-serve cost. */
  portions: number | null;
  costItems: CostLine[];
  costNote: string;
  /** Per portion, excluding rice. */
  nutrition: DishNutrition;
  nutritionNote: string;
};

export type SmoothieDraft = Omit<Smoothie, "id">;
export type DishDraft = Omit<Dish, "id">;

// --- Line-per-row text ---
//
// The ingredient and cost tables live in a Text property, one row per line
// with " | " between columns, e.g. "Avocado | ½ (~70 g) | 1.10 | 112 | …".
// It reads naturally in Notion and survives hand edits there.

export function parseNumber(raw: string | undefined): number | null {
  const cleaned = (raw ?? "").replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((cell) => cell.trim()));
}

const cell = (n: number | null) => (n === null ? "" : String(n));

export function parseSmoothieIngredients(text: string): SmoothieIngredient[] {
  return parseRows(text).map(([name = "", perServe = "", cost, kcal, protein, fat, carbs, fiber]) => ({
    name,
    perServe,
    cost: parseNumber(cost),
    kcal: parseNumber(kcal),
    protein: parseNumber(protein),
    fat: parseNumber(fat),
    carbs: parseNumber(carbs),
    fiber: parseNumber(fiber),
  }));
}

export function formatSmoothieIngredients(rows: SmoothieIngredient[]): string {
  return rows
    .filter((r) => r.name.trim())
    .map((r) =>
      [r.name.trim(), r.perServe.trim(), cell(r.cost), cell(r.kcal), cell(r.protein), cell(r.fat), cell(r.carbs), cell(r.fiber)].join(" | ")
    )
    .join("\n");
}

export function parseCostLines(text: string): CostLine[] {
  return parseRows(text).map(([ingredient = "", cost]) => ({ ingredient, cost: parseNumber(cost) }));
}

export function formatCostLines(rows: CostLine[]): string {
  return rows
    .filter((r) => r.ingredient.trim())
    .map((r) => `${r.ingredient.trim()} | ${cell(r.cost)}`)
    .join("\n");
}

// --- Derived figures ---

const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

export const money = (n: number) => `$${n.toFixed(2)}`;

export function smoothieTotals(ingredients: SmoothieIngredient[]) {
  return {
    cost: sum(ingredients.map((i) => i.cost)),
    kcal: Math.round(sum(ingredients.map((i) => i.kcal))),
    protein: round1(sum(ingredients.map((i) => i.protein))),
    fat: round1(sum(ingredients.map((i) => i.fat))),
    carbs: round1(sum(ingredients.map((i) => i.carbs))),
    fiber: round1(sum(ingredients.map((i) => i.fiber))),
  };
}

export function batchCost(dish: Pick<Dish, "costItems" | "portions">) {
  const total = sum(dish.costItems.map((c) => c.cost));
  return { total, perServe: dish.portions ? total / dish.portions : null };
}

export function hasNutrition(n: DishNutrition): boolean {
  return Object.values(n).some((v) => v !== null);
}
