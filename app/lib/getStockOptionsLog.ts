export type StockOptionsLogEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  employer: string;
  grant: string;
  value: number;
};

// Granular, per-grant — one row per employer/grant per month. This is where
// edits actually happen; getAssetGrowthLog() rolls these up by month into
// "Stock Options", carrying each grant's latest known value forward rather
// than summing every logged row.
export async function getStockOptionsLog(): Promise<StockOptionsLogEntry[]> {
  const databaseId = process.env.NOTION_STOCK_OPTIONS_LOG_ID;
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
        employer: props.Employer?.select?.name ?? "",
        grant: props.Grant?.rich_text?.[0]?.plain_text ?? "",
        value: props["Value (AUD)"]?.number ?? 0,
      };
    })
    .filter((e: StockOptionsLogEntry) => e.month);
}
