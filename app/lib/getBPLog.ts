export type BPEntry = {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
  heartRate: number | null;
};

export async function getBPLog(): Promise<BPEntry[]> {
  const databaseId = process.env.NOTION_BP_LOG_ID;
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
      sorts: [{ property: "Date", direction: "ascending" }], // BP table uses "Date"
    }),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();

  return data.results
    .map((page: any) => ({
      id: page.id,
      date: page.properties.Date?.date?.start ?? "",
      systolic: page.properties["Blood Pressure (Sys)"]?.number ?? 0,
      diastolic: page.properties["Blood Pressure (Dia)"]?.number ?? 0,
      heartRate: null,
    }))
    .filter((e: BPEntry) => e.date && e.systolic > 0);
}
