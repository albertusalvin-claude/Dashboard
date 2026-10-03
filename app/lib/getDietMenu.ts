import {
  DISH_MENU_ENV,
  dishTypeFromLabel,
  parseCostLines,
  parseSmoothieIngredients,
  type Dish,
  type DishMenuKind,
  type Smoothie,
} from "./dietMenu";

export function isSmoothiesConfigured(): boolean {
  return Boolean(process.env.NOTION_SMOOTHIES_ID && process.env.NOTION_API_KEY);
}

export function isDishMenuConfigured(kind: DishMenuKind): boolean {
  return Boolean(process.env[DISH_MENU_ENV[kind]] && process.env.NOTION_API_KEY);
}

type RichText = { plain_text: string }[];
type NotionProperty = {
  title?: RichText;
  rich_text?: RichText;
  number?: number | null;
  select?: { name: string } | null;
};
type NotionPage = { id: string; properties: Record<string, NotionProperty | undefined> };

// Every menu database is read in their saved Order, oldest first among ties, so a
// row added in Notion without an Order still lands somewhere stable.
async function queryInOrder(databaseId: string | undefined): Promise<NotionPage[]> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return [];

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sorts: [
        { property: "Order", direction: "ascending" },
        { timestamp: "created_time", direction: "ascending" },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.results;
}

// Long text is written in 2,000-character pieces (Notion's limit per piece),
// so it has to be joined back up rather than read from the first one.
const text = (prop: NotionProperty | undefined): string =>
  (prop?.rich_text ?? prop?.title ?? []).map((t) => t.plain_text).join("");

export async function getSmoothies(): Promise<Smoothie[]> {
  const pages = await queryInOrder(process.env.NOTION_SMOOTHIES_ID);
  return pages
    .map((page, index) => {
      const p = page.properties;
      return {
        id: page.id,
        name: text(p.Name),
        order: p.Order?.number ?? index,
        description: text(p.Description),
        ingredients: parseSmoothieIngredients(text(p.Ingredients)),
        costNote: text(p["Cost note"]),
        nutritionNote: text(p["Nutrition note"]),
      };
    })
    .filter((s) => s.name);
}

export async function getDishes(kind: DishMenuKind): Promise<Dish[]> {
  const pages = await queryInOrder(process.env[DISH_MENU_ENV[kind]]);
  return pages
    .map((page, index) => {
      const p = page.properties;
      return {
        id: page.id,
        name: text(p.Name),
        order: p.Order?.number ?? index,
        type: dishTypeFromLabel(p.Type?.select?.name ?? ""),
        notes: text(p.Notes),
        portions: p.Portions?.number ?? null,
        costItems: parseCostLines(text(p["Cost breakdown"])),
        costNote: text(p["Cost note"]),
        nutrition: {
          calories: p.Calories?.number ?? null,
          protein: p.Protein?.number ?? null,
          fat: p.Fat?.number ?? null,
          carbs: p.Carbs?.number ?? null,
          fiber: p.Fiber?.number ?? null,
        },
        nutritionNote: text(p["Nutrition note"]),
      };
    })
    .filter((d) => d.name);
}
