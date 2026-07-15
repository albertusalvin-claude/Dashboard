export type WeightEntry = {
  id: string;
  date: string;
  kg: number;
};

export async function getWeightLog(): Promise<WeightEntry[]> {
  const databaseId = process.env.NOTION_WEIGHT_LOG_ID;
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
      sorts: [{ property: "Date 1", direction: "ascending" }],
    }),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();

  return data.results
    .map((page: any) => ({
      id: page.id,
      date: page.properties["Date 1"]?.date?.start ?? "",
      kg: page.properties["Weight(kg)"]?.number ?? 0,
    }))
    .filter((e: WeightEntry) => e.date && e.kg > 0);
}
