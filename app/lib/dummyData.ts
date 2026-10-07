import { computeAssetGrowthLog, type AssetGrowthEntry } from "./getAssetGrowthLog";
import type { InvestmentLogEntry } from "./getInvestmentLog";
import type { SavingsLogEntry } from "./getSavingsLog";
import type { SuperannuationLogEntry } from "./getSuperannuationLog";
import type { StockOptionsLogEntry } from "./getStockOptionsLog";
import type { SpendingEntry } from "../api/spending/route";
import type { ShoppingItem } from "./getShoppingList";
import type { SpendingOptions } from "./getSpendingOptions";
import type { ShoppingOptions } from "./getShoppingOptions";
import type { WeightEntry } from "./getWeightLog";
import type { BPEntry } from "./getBPLog";
import type { FieldOptions, Person } from "./getRelationships";
import { DEFAULT_FI_ASSUMPTIONS, type FIAssumptions } from "./fiProjection";
import { parseCostLines, parseSmoothieIngredients, type DishType, type Dish, type Smoothie } from "./dietMenu";
import type { Habit, HabitCategory, HabitStatus, Task, TaskStatus } from "./actionables";

// Stand-in data for the /dummy routes: enough in every tab to see the charts,
// tables and forms populated without touching the real database, and without
// any real numbers.
//
// Dates are generated relative to today rather than hard-coded, so the demo
// never drifts into looking stale — which is why these are functions, and why
// the pages using them call connection() to stay out of the prerender.

/** YYYY-MM for a month offset back from this one. */
function monthsAgo(offset: number): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  return date.toISOString().slice(0, 7);
}

/** YYYY-MM-DD, `offset` days back from today. */
function daysAgo(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD for the day each month gets logged, never dated in the future. */
function monthlyDate(offset: number): string {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 5));
  return (target > now ? now : target).toISOString().slice(0, 10);
}

// A fixed seed, so the numbers look organic but don't reshuffle on every
// refresh — a demo that changes under you is hard to talk about or screenshot.
const SEED = 20260919;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** `base`, nudged by up to ±`spread`, to the nearest dollar. */
function jitter(rand: () => number, base: number, spread: number): number {
  return Math.round(base * (1 + (rand() * 2 - 1) * spread));
}

const MONTHS = 6;

/**
 * A holding's value month by month, oldest first: a jittered starting point
 * followed by a monthly drift somewhere in the given range, so balances wobble
 * the way real ones do instead of climbing by a fixed amount.
 */
function series(rand: () => number, base: number, minDrift: number, maxDrift: number): number[] {
  const values = [jitter(rand, base, 0.12)];
  for (let i = 1; i < MONTHS; i++) {
    const drift = minDrift + rand() * (maxDrift - minDrift);
    values.push(Math.round(values[i - 1] * (1 + drift)));
  }
  return values;
}

// One shared generator, so every log's numbers come from the same seeded
// stream and stay stable together.
const rand = seededRandom(SEED);

// The invented portfolio behind every /dummy money tab. Brokers, banks, funds
// and employers here are made up — none of this is anyone's real holdings, and
// nothing below is read from or written to the real database.
const DUMMY_INVESTMENT_HOLDINGS: { broker: string; ticker: string; values: number[] }[] = [
  { broker: "Stake", ticker: "VTS", values: series(rand, 21000, -0.02, 0.04) },
  { broker: "Stake", ticker: "VEU", values: series(rand, 11500, -0.025, 0.035) },
  { broker: "CommSec", ticker: "CASH", values: series(rand, 4800, -0.05, 0.06) },
];

const DUMMY_SAVINGS_ACCOUNTS: { bank: string; account: string; values: number[] }[] = [
  { bank: "ING", account: "Savings Maximiser", values: series(rand, 19500, 0.004, 0.02) },
  { bank: "ING", account: "Everyday", values: series(rand, 4600, -0.03, 0.04) },
];

const DUMMY_SUPER_FUNDS: { provider: string; values: number[] }[] = [
  { provider: "Australian Super", values: series(rand, 28500, 0.002, 0.025) },
];

const DUMMY_OPTION_GRANTS: { employer: string; grant: string; values: number[] }[] = [
  { employer: "Acme Corp", grant: "2024 RSU", values: series(rand, 11000, -0.01, 0.045) },
];

// Newest first, matching the order the real logs arrive in —
// dedupeLatest() in the logs tab relies on it.
function monthOffsets(): number[] {
  return Array.from({ length: MONTHS }, (_, i) => i);
}

export function dummyInvestmentLog(): InvestmentLogEntry[] {
  return monthOffsets().flatMap((offset) =>
    DUMMY_INVESTMENT_HOLDINGS.map(({ broker, ticker, values }) => ({
      id: `d-inv-${broker}-${ticker}-${offset}`,
      date: monthlyDate(offset),
      month: monthsAgo(offset),
      broker,
      ticker,
      value: values[MONTHS - 1 - offset],
    }))
  );
}

export function dummySavingsLog(): SavingsLogEntry[] {
  return monthOffsets().flatMap((offset) =>
    DUMMY_SAVINGS_ACCOUNTS.map(({ bank, account, values }) => ({
      id: `d-sav-${bank}-${account}-${offset}`,
      date: monthlyDate(offset),
      month: monthsAgo(offset),
      bank,
      account,
      value: values[MONTHS - 1 - offset],
    }))
  );
}

export function dummySuperannuationLog(): SuperannuationLogEntry[] {
  return monthOffsets().flatMap((offset) =>
    DUMMY_SUPER_FUNDS.map(({ provider, values }) => ({
      id: `d-sup-${provider}-${offset}`,
      date: monthlyDate(offset),
      month: monthsAgo(offset),
      provider,
      value: values[MONTHS - 1 - offset],
    }))
  );
}

export function dummyStockOptionsLog(): StockOptionsLogEntry[] {
  return monthOffsets().flatMap((offset) =>
    DUMMY_OPTION_GRANTS.map(({ employer, grant, values }) => ({
      id: `d-opt-${employer}-${grant}-${offset}`,
      date: monthlyDate(offset),
      month: monthsAgo(offset),
      employer,
      grant,
      value: values[MONTHS - 1 - offset],
    }))
  );
}

/**
 * Rolled up from the granular logs through the same function the real tab
 * uses, so the dummy Asset Growth Log adds up to its own rows rather than
 * being a second set of numbers that could drift out of agreement.
 */
export function dummyAssetGrowthLog(): AssetGrowthEntry[] {
  return computeAssetGrowthLog(
    dummyInvestmentLog(),
    dummySavingsLog(),
    dummySuperannuationLog(),
    dummyStockOptionsLog()
  );
}

/** The projection starts from where the logs actually ended up. */
export function dummyFIAssumptions(): FIAssumptions {
  const latest = dummyAssetGrowthLog().at(-1);
  return {
    ...DEFAULT_FI_ASSUMPTIONS,
    grossIncome: 120000,
    netIncome: 92000,
    years: 20,
    startingInvestment: latest?.liquidInvestment ?? DEFAULT_FI_ASSUMPTIONS.startingInvestment,
    startingSaving: latest?.savings ?? DEFAULT_FI_ASSUMPTIONS.startingSaving,
    startingSuperannuation: latest?.superannuation ?? DEFAULT_FI_ASSUMPTIONS.startingSuperannuation,
  };
}

export const DUMMY_LOG_OPTIONS = {
  brokers: ["Stake", "CommSec", "Vanguard"],
  tickers: ["VTS", "VEU", "VAS", "CASH"],
  banks: ["ING", "UBank", "Macquarie"],
  accounts: ["Savings Maximiser", "Everyday", "Offset"],
  providers: ["Australian Super", "Hostplus", "Rest"],
  employers: ["Acme Corp"],
};

export function dummySpending(): SpendingEntry[] {
  return [
    { id: "d-sp-1", item: "Weekly groceries", amount: 128.4, category: "Groceries", date: daysAgo(2), notes: "", paymentMethod: "Card", store: "Woolworths" },
    { id: "d-sp-2", item: "Coffee beans", amount: 22, category: "Groceries", date: daysAgo(5), notes: "1kg", paymentMethod: "Card", store: "Market Lane" },
    { id: "d-sp-3", item: "Running shoes", amount: 189.95, category: "Health", date: daysAgo(8), notes: "", paymentMethod: "Card", store: "The Athlete's Foot" },
    { id: "d-sp-4", item: "Train myki top-up", amount: 40, category: "Transport", date: daysAgo(11), notes: "", paymentMethod: "Card", store: "PTV" },
    { id: "d-sp-5", item: "Dinner with friends", amount: 64.5, category: "Eating Out", date: daysAgo(14), notes: "Birthday", paymentMethod: "Card", store: "Chin Chin" },
    { id: "d-sp-6", item: "Weekly groceries", amount: 141.2, category: "Groceries", date: daysAgo(21), notes: "", paymentMethod: "Card", store: "Coles" },
    { id: "d-sp-7", item: "Phone plan", amount: 35, category: "Bills", date: daysAgo(28), notes: "Monthly", paymentMethod: "Direct debit", store: "Amaysim" },
    { id: "d-sp-8", item: "Badminton court", amount: 18, category: "Health", date: daysAgo(35), notes: "", paymentMethod: "Cash", store: "MSAC" },
  ];
}

export function dummySpendingOptions(): SpendingOptions {
  const entries = dummySpending();
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
  return {
    categories: unique(entries.map((e) => e.category)),
    paymentMethods: unique(entries.map((e) => e.paymentMethod)),
  };
}

export function dummyShoppingList(): ShoppingItem[] {
  return [
    { id: "d-shop-1", item: "Standing desk", category: "Home", estPrice: 450, link: "", notes: "Wait for a sale", priority: "Medium", status: "Researching" },
    { id: "d-shop-2", item: "Noise-cancelling headphones", category: "Tech", estPrice: 380, link: "", notes: "", priority: "High", status: "Ready to buy" },
    { id: "d-shop-3", item: "Winter jacket", category: "Clothing", estPrice: 220, link: "", notes: "", priority: "Low", status: "Researching" },
  ];
}

// The weight tab carries a hard-coded goal band, so these sit inside it —
// a gentle gain on target pace, rather than numbers that read as wildly off.
export function dummyShoppingOptions(): ShoppingOptions {
  return {
    categories: ["Home", "Tech / Setup", "Clothing", "Other"],
    priorities: ["High", "Medium", "Low"],
    statuses: ["Watching", "Ready to Buy", "Purchased", "Skipped"],
  };
}

export function dummyWeightLog(): WeightEntry[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `d-w-${i}`,
    date: daysAgo((7 - i) * 7),
    kg: Math.round((59.4 + i * 0.18) * 10) / 10,
  }));
}

export function dummyBPLog(): BPEntry[] {
  return [
    { id: "d-bp-1", date: daysAgo(3), systolic: 118, diastolic: 76, heartRate: 62 },
    { id: "d-bp-2", date: daysAgo(17), systolic: 121, diastolic: 78, heartRate: 65 },
    { id: "d-bp-3", date: daysAgo(31), systolic: 124, diastolic: 80, heartRate: 68 },
    { id: "d-bp-4", date: daysAgo(45), systolic: 119, diastolic: 75, heartRate: 61 },
  ];
}

export function dummyPeople(): Person[] {
  return [
    { id: "d-p-1", name: "Rina Halim", origin: "Jakarta", originState: "Jakarta", currentLocation: "Melbourne", currentState: "Victoria", futurePlan: "Singapore", futureState: "", interests: ["Climbing", "Film"], occupations: ["Designer"], utilities: ["Has a car"], notes: "" },
    { id: "d-p-2", name: "Tom Whitfield", origin: "Melbourne", originState: "Victoria", currentLocation: "Sydney", currentState: "New South Wales", futurePlan: "", futureState: "", interests: ["Cycling"], occupations: ["Engineer"], utilities: ["Spare room"], notes: "" },
    { id: "d-p-3", name: "Priya Raman", origin: "Bengaluru", originState: "Karnataka", currentLocation: "London", currentState: "England", futurePlan: "Berlin", futureState: "Berlin", interests: ["Chess", "Cooking"], occupations: ["Doctor"], utilities: ["Medical advice"], notes: "" },
    { id: "d-p-4", name: "Wei Chen", origin: "Singapore", originState: "", currentLocation: "Hong Kong", currentState: "", futurePlan: "Sydney", futureState: "New South Wales", interests: ["Running"], occupations: ["Trader"], utilities: [], notes: "" },
    { id: "d-p-5", name: "Dani Moreno", origin: "Bogota", originState: "Bogota", currentLocation: "New York", currentState: "New York", futurePlan: "", futureState: "", interests: ["Salsa"], occupations: ["Analyst"], utilities: ["Intros to investors"], notes: "" },
  ];
}

export function dummyRelationshipOptions(): FieldOptions {
  return {
    origin: ["Jakarta", "Melbourne", "Bengaluru", "Singapore", "Bogota"],
    originState: ["Jakarta", "Victoria", "Karnataka", "Bogota"],
    currentLocation: ["Melbourne", "Sydney", "London", "Hong Kong", "New York"],
    currentState: ["Victoria", "New South Wales", "England", "New York"],
    futurePlan: ["Singapore", "Berlin", "Sydney"],
    futureState: ["Berlin", "New South Wales"],
    interests: ["Climbing", "Film", "Cycling", "Chess", "Cooking", "Running", "Salsa"],
    occupations: ["Designer", "Engineer", "Doctor", "Trader", "Analyst"],
    utilities: ["Has a car", "Spare room", "Medical advice", "Intros to investors"],
  };
}

// An invented menu — the real one lives in Notion and stays out of the demo.
export function dummySmoothies(): Smoothie[] {
  return [
    {
      id: "d-smoothie-1",
      name: "Mango & spinach",
      order: 0,
      description: "Bright and sweet — the spinach disappears behind the mango.",
      ingredients: parseSmoothieIngredients(
        [
          "Frozen mango | 1 cup (~165 g) | 1.40 | 99 | 1.4 | 0.6 | 24.7 | 2.6",
          "Banana | 1 medium | 0.40 | 105 | 1.3 | 0.4 | 27.0 | 3.1",
          "Baby spinach | 1 handful (~30 g) | 0.45 | 7 | 0.9 | 0.1 | 1.1 | 0.7",
          "Oat milk | 1 cup | 0.60 | 120 | 3.0 | 5.0 | 16.0 | 2.0",
          "Flaxseed | 1 tbsp | 0.15 | 37 | 1.3 | 3.0 | 2.0 | 1.9",
        ].join("\n")
      ),
      costNote: "Supermarket prices, rounded.",
      nutritionNote: "Most of the carbs are fruit sugar, balanced by ~10 g of fiber.",
    },
    {
      id: "d-smoothie-2",
      name: "Cocoa peanut",
      order: 1,
      description: "Post-workout — tastes like dessert, earns its protein.",
      ingredients: parseSmoothieIngredients(
        [
          "Milk | 1 cup | 0.45 | 122 | 8.1 | 4.8 | 11.7 | 0",
          "Banana | 1 medium | 0.40 | 105 | 1.3 | 0.4 | 27.0 | 3.1",
          "Peanut butter | 1 tbsp (~16 g) | 0.20 | 94 | 4.0 | 8.0 | 3.2 | 1.0",
          "Cocoa powder | 1 tbsp | 0.25 | 12 | 1.1 | 0.7 | 3.1 | 1.8",
          "Rolled oats | ¼ cup | 0.15 | 75 | 2.6 | 1.3 | 13.5 | 2.0",
        ].join("\n")
      ),
      costNote: "",
      nutritionNote: "",
    },
  ];
}

const noNutrition = { calories: null, protein: null, fat: null, carbs: null, fiber: null };

function dummyDish(prefix: string, portions: number) {
  return (order: number, name: string, type: DishType, notes: string, extra: Partial<Dish> = {}): Dish => ({
    id: `d-${prefix}-${order}`,
    name,
    order,
    type,
    notes,
    portions,
    costItems: [],
    costNote: "",
    nutrition: noNutrition,
    nutritionNote: "",
    ...extra,
  });
}

export function dummyMealPrep(): Dish[] {
  const dish = dummyDish("prep", 5);
  return [
    dish(0, "Chickpea & spinach curry", "veg", "Cheap, freezes well, and the spinach goes in at the end so it stays green.", {
      costItems: parseCostLines(
        "Chickpeas 2 × 400 g | 2.40\nCoconut milk 400 ml | 2.20\nBaby spinach 120 g | 3.00\nOnion | 0.60\nGarlic & ginger | 1.20\nCurry paste | 2.50\nBrown rice 500 g | 1.60"
      ),
      costNote: "Supermarket prices, rounded. Batch of 5.",
      nutrition: { calories: 480, protein: 15, fat: 18, carbs: 62, fiber: 11 },
      nutritionNote: "Per portion, including the rice.",
    }),
    dish(1, "Lemon herb chicken traybake", "veg", "Everything on one tray — chicken thighs, potatoes, zucchini and red onion.", {
      costItems: parseCostLines("Chicken thighs 1 kg | 9.00\nBaby potatoes 1 kg | 3.50\nZucchini × 2 | 2.00\nRed onion × 2 | 1.00\nLemon + herbs | 2.00\nOlive oil | 0.60"),
      costNote: "Batch of 5.",
      nutrition: { calories: 520, protein: 42, fat: 22, carbs: 36, fiber: 5 },
      nutritionNote: "",
    }),
    dish(2, "Beef & bean chilli", "beef", "Half the mince swapped for kidney beans — more fiber, still tastes like chilli."),
    dish(3, "Salmon soba bowls", "egg", "Baked salmon over soba with edamame and a sesame-soy dressing. Keep the dressing separate until eating."),
    dish(4, "Pumpkin & ricotta lasagne", "carb", "A vegetarian week. Roast the pumpkin first so it isn't watery."),
    dish(5, "Lamb kofta wraps", "beef", "Koftas keep three days; build the wraps fresh with yoghurt and cucumber."),
  ];
}

export function dummyOneOff(): Dish[] {
  const dish = dummyDish("one-off", 1);
  return [
    dish(0, "Shakshuka", "egg", "Eggs poached in spiced tomato — ten minutes, one pan, good with crusty bread."),
    dish(1, "Mushroom risotto", "carb", "Slow but forgiving. A splash of white wine and plenty of parmesan."),
    dish(2, "Fish tacos", "egg", "Crumbed white fish, slaw and lime crema."),
    dish(3, "Pad see ew", "carb", "Wide rice noodles, gai lan and egg. Hot wok, small batches."),
  ];
}

/** An ISO timestamp `offset` days back, for Notion's created / last-edited times. */
function stampDaysAgo(offset: number, hour = 9): string {
  return `${daysAgo(offset)}T${String(hour).padStart(2, "0")}:15:00.000Z`;
}

export function dummyHabits(): Habit[] {
  const habit = (
    order: number,
    name: string,
    category: HabitCategory,
    endDate: string | null,
    description: string,
    status: HabitStatus = "Active"
  ): Habit => ({
    id: `d-habit-${name.toLowerCase().replace(/[^a-z]+/g, "-").slice(0, 40)}`,
    name,
    order,
    status,
    category,
    endDate,
    description,
    createdTime: stampDaysAgo(40 - order * 5),
    lastEditedTime: stampDaysAgo(3 + order),
  });
  return [
    habit(0, "Read 20 pages", "Other", null, "Before bed, phone in the other room."),
    habit(1, "No sugary drinks", "Health", daysAgo(-21), "30-day reset. Sparkling water is fine."),
    habit(2, "Stretch after runs", "Health", null, "Hamstrings, calves, hip flexors — 10 minutes."),
    habit(3, "Call family on Sundays", "Relationship", null, "Alternate between Mum and Dad."),
    habit(4, "Log spending weekly", "Money", null, "Sunday evening, straight into Money · Spending."),
    // Long enough to hit the three-line limit on a phone, so the "…" shows.
    habit(
      6,
      "Before opening the laptop each morning, spend ten minutes outside in daylight with no phone, then write down the single most important thing to finish today",
      "Health",
      null,
      "Morning light helps set the body clock; the note keeps the day focused."
    ),
    habit(5, "Duolingo streak", "Other", daysAgo(4), "Finished the Spanish A1 course."),
    habit(0, "Meal prep on Sundays", "Health", null, "Start once the new kitchen shelves are up.", "Backlog"),
    habit(1, "Monthly coffee with an old friend", "Relationship", null, "", "Backlog"),
    habit(0, "Cold showers", "Health", null, "Tried for a month; not for me.", "Archived"),
  ];
}

export function dummyTasks(): Task[] {
  const task = (
    order: number,
    name: string,
    status: TaskStatus,
    extra: Partial<Task> = {}
  ): Task => ({
    id: `d-task-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    name,
    order,
    status,
    project: "General",
    dueDate: null,
    description: "",
    parentId: null,
    createdTime: stampDaysAgo(20 - order),
    lastEditedTime: stampDaysAgo(1, 14),
    ...extra,
  });
  return [
    task(0, "Renew passport", "Todo", { dueDate: daysAgo(-14), description: "Photos from the post office; the old passport has to go in with the form." }),
    task(1, "Plan Japan trip", "Todo", { project: "Travel", dueDate: daysAgo(-60), description: "Two weeks in April. Tokyo → Kyoto → Osaka." }),
    task(0, "Book flights", "Todo", { project: "Travel", parentId: "d-task-plan-japan-trip", dueDate: daysAgo(-30) }),
    task(1, "Shortlist ryokans", "Doing", { project: "Travel", parentId: "d-task-plan-japan-trip" }),
    task(2, "Get JR pass", "Done", { project: "Travel", parentId: "d-task-plan-japan-trip" }),
    task(2, "Fix bike brakes", "Todo", { project: "Home", dueDate: daysAgo(2) }),
    // Long titles, to show cards wrapping to three lines before the "…".
    task(3, "Sort out the home contents insurance renewal, compare at least three quotes, check the excess and whether the bike and laptop are covered away from home", "Todo", {
      dueDate: daysAgo(-9),
    }),
    task(3, "Ask about a group discount for the Kyoto tea ceremony and whether it can be moved to the morning so it doesn't clash with the Fushimi Inari hike", "Todo", {
      project: "Travel",
      parentId: "d-task-plan-japan-trip",
    }),
    task(0, "Quarterly tax estimate", "Doing", { project: "Admin", dueDate: daysAgo(-5), description: "Pull the numbers from Money · Spending first." }),
    task(1, "Clear out the garage", "Doing", { project: "Home" }),
    task(0, "Switch electricity plan", "Done", { project: "Admin", description: "Saved ~$140/yr." }),
    task(1, "Dentist check-up", "Done"),
    task(2, "Build the raised veggie bed", "Done", { project: "Garden" }),
  ];
}
