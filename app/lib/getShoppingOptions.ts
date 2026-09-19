export type ShoppingOptions = {
  categories: string[];
  priorities: string[];
  statuses: string[];
};

const EMPTY: ShoppingOptions = { categories: [], priorities: [], statuses: [] };

type NotionSelectSchema = { select?: { options?: { name: string }[] } };

/**
 * The options defined on the shopping list's Select properties, in one
 * request. Priority and Status carry emoji in their names ("⭐ High"), so the
 * form offers the real values rather than inviting a plain-text near-miss.
 */
export async function getShoppingOptions(): Promise<ShoppingOptions> {
  const databaseId = process.env.NOTION_SHOPPING_LIST_ID;
  const apiKey = process.env.NOTION_API_KEY;

  if (!databaseId || !apiKey) return EMPTY;

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
    },
    cache: "no-store",
  });

  if (!res.ok) return EMPTY;

  const data = await res.json();
  const properties: Record<string, NotionSelectSchema> = data.properties ?? {};
  const names = (property: string) => (properties[property]?.select?.options ?? []).map((o) => o.name);

  return {
    categories: names("Category"),
    priorities: names("Priority"),
    statuses: names("Status"),
  };
}
