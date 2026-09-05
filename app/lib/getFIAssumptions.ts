import { DEFAULT_FI_ASSUMPTIONS, FI_FIELDS, type FIAssumptions } from "./fiProjection";

// Single-row Notion database: one page holds every current assumption as a
// Number property (named per FI_FIELDS[].notionProperty). Falls back to
// DEFAULT_FI_ASSUMPTIONS wholesale (no credentials/DB) or field-by-field
// (a property missing from an older row) so a partially-set-up sheet still works.
export async function getFIAssumptions(): Promise<FIAssumptions> {
  const databaseId = process.env.NOTION_MONEY_PROJECTION_ASSUMPTIONS_ID;
  const apiKey = process.env.NOTION_API_KEY;

  if (!databaseId || !apiKey) return DEFAULT_FI_ASSUMPTIONS;

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 1 }),
    cache: "no-store",
  });

  if (!res.ok) return DEFAULT_FI_ASSUMPTIONS;

  const data = await res.json();
  const page = data.results?.[0];
  if (!page) return DEFAULT_FI_ASSUMPTIONS;

  const result: FIAssumptions = { ...DEFAULT_FI_ASSUMPTIONS };
  for (const field of FI_FIELDS) {
    const raw = page.properties?.[field.notionProperty]?.number;
    if (typeof raw === "number") {
      result[field.key] = field.percent ? raw / 100 : raw;
    }
  }
  return result;
}
