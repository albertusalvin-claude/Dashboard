export type SuperannuationLogEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  provider: string;
  value: number;
};

// Granular, per-provider — one row per super fund per month. This is where
// edits actually happen; getAssetGrowthLog() rolls these up by month into
// "Superannuation", carrying each provider's latest known value forward
// rather than summing every logged row.
export async function getSuperannuationLog(): Promise<SuperannuationLogEntry[]> {
  const databaseId = process.env.NOTION_SUPERANNUATION_LOG_ID;
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
      const date = props.Date?.date?.start ?? "";
      return {
        id: page.id,
        date: date.slice(0, 10),
        month: date.slice(0, 7),
        provider: props.Provider?.select?.name ?? "",
        value: props["Value (AUD)"]?.number ?? 0,
      };
    })
    .filter((e: SuperannuationLogEntry) => e.month);
}
