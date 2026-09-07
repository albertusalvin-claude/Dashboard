export type InvestmentLogEntry = {
  id: string;
  date: string; // YYYY-MM-DD, the raw logged date
  month: string; // YYYY-MM, derived from date
  broker: string;
  ticker: string; // a ticker, or literally "CASH" for uninvested cash in the account
  value: number;
};

// Granular, per-holding — one row per broker/ticker (or broker/CASH) logged
// at some date. This is where edits actually happen; getAssetGrowthLog()
// rolls these up by month into "Liquid Investment", carrying each holding's
// latest known value forward rather than summing every logged row.
export async function getInvestmentLog(): Promise<InvestmentLogEntry[]> {
  const databaseId = process.env.NOTION_INVESTMENTS_VALUE_LOG_ID;
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
        broker: props.Broker?.select?.name ?? "",
        ticker: props["Stock/ETF/Cash"]?.select?.name ?? "",
        value: props["Value (AUD)"]?.number ?? 0,
      };
    })
    .filter((e: InvestmentLogEntry) => e.month);
}
