import type { SpendingEntry } from "../api/spending/route";

export async function getSpending(): Promise<SpendingEntry[]> {
  const databaseId = process.env.NOTION_DATABASE_ID;
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
      sorts: [{ property: "Date", direction: "descending" }],
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
        amount: props.Amount?.number ?? 0,
        category: props.Category?.select?.name ?? "",
        date: props.Date?.date?.start ?? "",
        notes: props.Notes?.rich_text?.[0]?.plain_text ?? "",
        paymentMethod: props["Payment Method"]?.select?.name ?? "",
      };
    })
    .filter((e: SpendingEntry) => e.date);
}
