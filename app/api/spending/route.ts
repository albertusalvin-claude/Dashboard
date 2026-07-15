import { NextResponse } from "next/server";

export type SpendingEntry = {
  id: string;
  item: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  paymentMethod: string;
  store: string;
};

export async function GET() {
  const databaseId = process.env.NOTION_SPENDING_ID;
  const apiKey = process.env.NOTION_API_KEY;

  if (!databaseId || !apiKey) {
    return NextResponse.json({ error: "Missing Notion credentials" }, { status: 500 });
  }

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
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const data = await res.json();

  const entries: SpendingEntry[] = data.results
    .map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        item: props.Item?.title?.[0]?.plain_text ?? "",
        amount: props.Amount?.number ?? 0,
        category: props.Category?.select?.name ?? "",
        date: (props.Date?.date?.start ?? "").slice(0, 10),
        notes: props.Notes?.rich_text?.[0]?.plain_text ?? "",
        paymentMethod: props["Payment Method"]?.select?.name ?? "",
        store: props.Store?.select?.name ?? "",
      };
    })
    .filter((e: SpendingEntry) => e.date);

  return NextResponse.json(entries);
}
