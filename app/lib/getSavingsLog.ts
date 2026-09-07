export type SavingsLogEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  bank: string;
  account: string;
  value: number;
};

// Granular, per-account — one row per bank/account logged at some date. This
// is where edits actually happen; getAssetGrowthLog() rolls these up by
// month into "Savings", carrying each account's latest known value forward
// rather than summing every logged row.
export async function getSavingsLog(): Promise<SavingsLogEntry[]> {
  const databaseId = process.env.NOTION_SAVINGS_LOG_ID;
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
        bank: props.Bank?.select?.name ?? "",
        account: props.Account?.select?.name ?? "",
        value: props["Value (AUD)"]?.number ?? 0,
      };
    })
    .filter((e: SavingsLogEntry) => e.month);
}
