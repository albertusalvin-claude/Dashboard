// Creates the Diet tab's three menu databases (Smoothies, Meal Prep, One-off
// Dishes) in Notion and fills them with the menu the tab used to hard-code.
//
//   node --env-file=.env.local scripts/create-diet-menu-dbs.mjs --dry-run
//   node --env-file=.env.local scripts/create-diet-menu-dbs.mjs
//   node --env-file=.env.local scripts/create-diet-menu-dbs.mjs --parent <page id or URL>
//
//   … --smoothies-page <url> --meal-prep-page <url> --one-off-page <url>
//
// Needs NOTION_API_KEY. Each database goes under its own --*-page if given,
// otherwise under --parent, or by default under
// the page that holds the Weight Log database (NOTION_WEIGHT_LOG_ID), which the
// integration can already reach. A database the integration creates is shared
// with it automatically. A database whose title already exists is skipped, so
// running it twice won't duplicate anything.
//
// Prints the env lines to add to .env.local and Vercel. Never prints the key.

const API_KEY = process.env.NOTION_API_KEY;
if (!API_KEY) {
  console.error("NOTION_API_KEY isn't set. Run with: node --env-file=.env.local scripts/create-diet-menu-dbs.mjs");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const parentArg = flag("--parent");

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data.message ?? JSON.stringify(data)}`);
  return data;
}

/** A 32-hex page ID from a bare ID or a Notion URL. */
function pageIdFrom(value) {
  const hex = value.replace(/-/g, "").match(/[0-9a-f]{32}(?=[^0-9a-f]*$)/i);
  if (!hex) throw new Error(`Couldn't find a page ID in "${value}".`);
  return hex[0];
}

const plain = (rich) => (rich ?? []).map((t) => t.plain_text).join("");

async function resolveParent() {
  if (parentArg) return pageIdFrom(parentArg);
  const weightLogId = process.env.NOTION_WEIGHT_LOG_ID;
  if (!weightLogId) throw new Error("Pass --parent <page id or URL> (NOTION_WEIGHT_LOG_ID isn't set to default from).");
  const db = await notion("GET", `/databases/${weightLogId}`);
  if (db.parent?.type !== "page_id") {
    throw new Error(`The Weight Log sits under a ${db.parent?.type}, not a page — pass --parent <page id or URL>.`);
  }
  return db.parent.page_id;
}

async function pageTitle(pageId) {
  const page = await notion("GET", `/pages/${pageId}`);
  const titleProp = Object.values(page.properties).find((p) => p.type === "title");
  return plain(titleProp?.title) || "(untitled)";
}

async function existingDatabase(title) {
  const found = await notion("POST", "/search", { query: title, filter: { property: "object", value: "database" } });
  return found.results.find((db) => plain(db.title) === title && !db.archived && !db.in_trash);
}

// --- Property helpers (the same shapes app/actions/dietMenu.ts writes) ---

const text = (value) => ({ rich_text: value ? [{ text: { content: value } }] : [] });
const num = (value) => ({ number: value ?? null });
const cents = (value) => ({ number: value == null ? null : Math.round(value * 100) / 100 });
const sumCosts = (lines, column) =>
  lines.split("\n").reduce((total, line) => total + (Number(line.split("|")[column]?.trim()) || 0), 0);

const TYPE_OPTIONS = [
  { name: "Veg", color: "green" },
  { name: "Beef", color: "red" },
  { name: "Carb", color: "yellow" },
  { name: "Fish / egg", color: "purple" },
];

const DISH_SCHEMA = {
  Name: { title: {} },
  Order: { number: {} },
  Type: { select: { options: TYPE_OPTIONS } },
  Notes: { rich_text: {} },
  Portions: { number: {} },
  "Cost breakdown": { rich_text: {} },
  "Cost per portion": { number: { format: "dollar" } },
  "Cost note": { rich_text: {} },
  Calories: { number: {} },
  Protein: { number: {} },
  Fat: { number: {} },
  Carbs: { number: {} },
  Fiber: { number: {} },
  "Nutrition note": { rich_text: {} },
};

const SMOOTHIE_SCHEMA = {
  Name: { title: {} },
  Order: { number: {} },
  Description: { rich_text: {} },
  Ingredients: { rich_text: {} },
  "Cost per portion": { number: { format: "dollar" } },
  "Cost note": { rich_text: {} },
  "Nutrition note": { rich_text: {} },
};

function dishRow(order, portions, { name, type, notes, costBreakdown = "", costNote = "", nutrition = {}, nutritionNote = "" }) {
  return {
    Name: { title: [{ text: { content: name } }] },
    Order: num(order),
    Type: { select: { name: type } },
    Notes: text(notes),
    Portions: num(portions),
    "Cost breakdown": text(costBreakdown),
    "Cost per portion": cents(costBreakdown ? sumCosts(costBreakdown, 1) / portions : null),
    "Cost note": text(costNote),
    Calories: num(nutrition.calories),
    Protein: num(nutrition.protein),
    Fat: num(nutrition.fat),
    Carbs: num(nutrition.carbs),
    Fiber: num(nutrition.fiber),
    "Nutrition note": text(nutritionNote),
  };
}

const SMOOTHIE_INGREDIENTS = [
  "Frozen blueberries | ⅙ bag (~165 g) | 2.00 | 94 | 1.2 | 0.5 | 23.9 | 4.0",
  "Avocado | ½ (~70 g) | 1.10 | 112 | 1.4 | 10.3 | 5.9 | 4.7",
  "Kale (leaf) | ¼ bunch (~40 g) | 1.03 | 14 | 1.2 | 0.6 | 1.8 | 1.6",
  "Greek yogurt | ½ cup (~125 g) | 0.47 | 113 | 7.5 | 5.6 | 7.5 | 0",
  "Chia seeds | 1 tbsp (~12 g) | 0.31 | 58 | 2.0 | 3.7 | 5.0 | 4.1",
  "Peanut butter | 1 tbsp (~16 g) | 0.14 | 94 | 4.0 | 8.0 | 3.2 | 1.0",
  "Water | 1 cup | 0 | 0 | 0 | 0 | 0 | 0",
].join("\n");

const SMOOTHIES = [
  {
    Name: { title: [{ text: { content: "Kale & blueberry" } }] },
    Order: num(0),
    Description: text("Every morning — kale · blueberries · ½ avocado · water + peanut butter & Greek yogurt when you like."),
    Ingredients: text(SMOOTHIE_INGREDIENTS),
    "Cost per portion": cents(sumCosts(SMOOTHIE_INGREDIENTS, 2)),
    "Cost note": text(
      "Prices from Woolworths Metro after 10% member discount. One blueberry bag stretches to 6 servings, one kale bunch to ~4 days."
    ),
    "Nutrition note": text(
      "~26 g of the carbs are natural fruit + dairy sugar, packaged with 15 g fiber. Big micronutrient load — vitamin K, C, potassium — and ~2 g ALA omega-3 from the chia."
    ),
  },
];

const MEAL_PREP = [
  {
    name: "Capcai",
    type: "Veg",
    notes: "The standout — a mixed-veg stir-fry that alone pushes toward 30 plants/week. Cook with chicken, prawns or egg and be generous with oil, since it's light on calories solo.",
    costBreakdown: [
      "Chicken thigh (pack) | 5.71",
      "Fish ball 500 g | 4.41",
      "Broccoli 502 g | 2.03",
      "Spring onion | 1.50",
      "Garlic (~½ pack) | 1.05",
      "Ginger | 1.00",
      "Snow peas 92 g | 0.82",
      "Beef stock (~½ L) | 0.68",
      "Oil (~2 tbsp) | 0.30",
      "Carrot 117 g | 0.27",
      "Cornflour (~1 tbsp) | 0.09",
    ].join("\n"),
    costNote: "Woolworths prices after 10% member discount. Batch of 5 portions.",
    nutrition: { calories: 379, protein: 38, fat: 17, carbs: 22, fiber: 4 },
    nutritionNote: "Per portion, excluding rice. Rice adds ~300 kcal. Each extra tbsp of oil adds ~120 kcal — oil is the lever if gaining feels slow.",
  },
  {
    name: "Ginger fish",
    type: "Fish / egg",
    notes: "Basa + ginger, chili, garlic + bok choy, over rice. Most complete week — protein, calcium (bok choy), vitamins. Add generous rice + a drizzle of sesame or olive oil for calories. Basa has almost no omega-3, so lean on tuna/fish-oil that week.",
  },
  {
    name: "Pork & chives dumplings",
    type: "Carb",
    notes: "Ground pork + chives, steamed with rice. Protein, fat, calories (your richest week). Steamed greens essential — the dish has none; fold shiitake or cabbage into the filling. Highest sodium week — go lighter on oyster sauce + chicken powder.",
  },
  {
    name: "Ginger chicken",
    type: "Veg",
    notes: "Skinless drumstick (or thigh) + ginger, garlic, chili. Lean protein, B vitamins, zinc, selenium. Use two drumsticks not one; greens on the side; extra dash of sesame oil. Light on calories & veg — nuts as a snack that week.",
  },
  {
    name: "Sapi cincang + kacang panjang",
    type: "Beef",
    notes: "Minced beef + long beans: protein and a green in one pan. Best-balanced of the beef dishes thanks to the beans — but it counts toward your red-meat cap.",
  },
  {
    name: "Beef steak + kimchi",
    type: "Beef",
    notes: "Best of the beef dishes for longevity — the fermented kimchi feeds your gut microbiome. Iron, zinc, B12, creatine all help muscle gain in a surplus.",
  },
  {
    name: "Beef teriyaki",
    type: "Beef",
    notes: "Calorie-dense and useful for gaining, but the sauce is the saltiest and sugariest here — space it out and go easy on the glaze.",
  },
  {
    name: "Spaghetti bolognese",
    type: "Beef",
    notes: "Stretches beautifully: cut the beef 50/50 with lentils or extra tomato + mushroom to lower the meat load while adding fiber and lycopene.",
  },
  {
    name: "Kangkung cah ayam",
    type: "Veg",
    notes: "Stir-fry on high heat — garlic and chilli first until fragrant, add chicken until just cooked through, then fishballs and tomato for a minute, kangkung last (wilts in 30 s). Dash of fish sauce to finish. Keep the heat high so the kangkung stays vibrant rather than soggy.",
    costBreakdown: [
      "Chicken thigh ~750 g | 11.00",
      "Kangkung × 3 bunches | 5.00",
      "Fish ball 400 g (~20 balls) | 5.00",
      "Tomato × 2 | 1.00",
      "Chilli × 5 | 1.00",
      "Oil (~5 tbsp) | 0.75",
      "Garlic (~½ pack) | 0.55",
      "Fish sauce | 0.20",
    ].join("\n"),
    costNote: "Woolworths prices after 10% member discount. Batch of 5 portions.",
    nutrition: { calories: 550, protein: 40, fat: 32, carbs: 20, fiber: 2 },
    nutritionNote: "Per serve, excluding rice. Rice adds ~300 kcal. Most energy comes from the chicken thigh and cooking oil — kangkung itself is very low-calorie but packs iron, folate, and vitamin K.",
  },
].map((dish, order) => dishRow(order, 5, dish));

const ONE_OFF = [
  {
    name: "Kwetiau siram",
    type: "Carb",
    notes: "Flat noodles in savory gravy — easy calories, but the gravy is sodium-heavy, so this is a go-light-on-the-sauce dish.",
  },
  {
    name: "Bubur ikan / sapi",
    type: "Carb",
    notes: "Congee — great for low-appetite days when you still need calories. Pick the fish version: lighter on saturated fat and adds a little omega-3.",
  },
  {
    name: "Kuah telor",
    type: "Fish / egg",
    notes: "Egg soup — complete protein with choline and a little vitamin D, which is otherwise scarce in your rotation. Good light main or protein-boosting side.",
  },
  {
    name: "Spaghetti tuna",
    type: "Fish / egg",
    notes: "Already your omega-3 constant. Skipjack in oil, plus tomatoes/spinach/peas and generous olive oil.",
  },
].map((dish, order) => dishRow(order, 1, dish));

const DATABASES = [
  { title: "Smoothies", envVar: "NOTION_SMOOTHIES_ID", pageFlag: "--smoothies-page", schema: SMOOTHIE_SCHEMA, rows: SMOOTHIES },
  { title: "Meal Prep", envVar: "NOTION_MEAL_PREP_ID", pageFlag: "--meal-prep-page", schema: DISH_SCHEMA, rows: MEAL_PREP },
  { title: "One-off Dishes", envVar: "NOTION_ONE_OFF_ID", pageFlag: "--one-off-page", schema: DISH_SCHEMA, rows: ONE_OFF },
];

if (dryRun) console.log("Dry run — nothing will be created.\n");

let defaultParent;
const envLines = [];
for (const { title, envVar, pageFlag, schema, rows } of DATABASES) {
  const parentId = flag(pageFlag) ? pageIdFrom(flag(pageFlag)) : (defaultParent ??= await resolveParent());
  console.log(`${title} → page "${await pageTitle(parentId)}"`);
  const existing = await existingDatabase(title);
  if (existing) {
    console.log(`• ${title}: already exists, skipped (${existing.url})`);
    envLines.push(`${envVar}=${existing.id.replace(/-/g, "")}`);
    continue;
  }
  if (dryRun) {
    console.log(`• ${title}: would create with ${rows.length} row(s)`);
    continue;
  }

  const db = await notion("POST", "/databases", {
    parent: { type: "page_id", page_id: parentId },
    title: [{ text: { content: title } }],
    properties: schema,
  });
  // One at a time, in Order, so the rows also appear in that order in Notion.
  for (const properties of rows) {
    await notion("POST", "/pages", { parent: { database_id: db.id }, properties });
  }
  console.log(`• ${title}: created with ${rows.length} row(s) — ${db.url}`);
  envLines.push(`${envVar}=${db.id.replace(/-/g, "")}`);
}

if (envLines.length) {
  console.log("\nAdd to .env.local and the Vercel project:\n");
  for (const line of envLines) console.log(line);
}
