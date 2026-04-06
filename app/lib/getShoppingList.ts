export type ShoppingItem = {
  id: string;
  item: string;
  category: string;
  estPrice: number | null;
  link: string;
  notes: string;
  priority: string;
  status: string;
};

export async function getShoppingList(): Promise<ShoppingItem[]> {
  const databaseId = process.env.NOTION_SHOPPING_LIST_ID;
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
      sorts: [{ property: "Item", direction: "ascending" }],
    }),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();

  return data.results
    .map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        item: props.Item?.title?.[0]?.plain_text ?? "",
        category: props.Category?.select?.name ?? "",
        estPrice: props["Est. Price (AUD)"]?.number ?? null,
        link: props.Link?.url ?? "",
        notes: props.Notes?.rich_text?.[0]?.plain_text ?? "",
        priority: props.Priority?.select?.name ?? "",
        status: props.Status?.select?.name ?? "",
      };
    })
    .filter((e: ShoppingItem) => e.item);
}
