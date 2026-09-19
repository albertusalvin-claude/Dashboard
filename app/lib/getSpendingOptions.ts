export type SpendingOptions = {
  categories: string[];
  paymentMethods: string[];
};

const EMPTY: SpendingOptions = { categories: [], paymentMethods: [] };

type NotionSelectSchema = { select?: { options?: { name: string }[] } };

/**
 * The options already defined on the spending database's Select properties, in
 * one request, so the edit form suggests the categories and stores in use
 * rather than inviting a second spelling of each.
 */
export async function getSpendingOptions(): Promise<SpendingOptions> {
  const databaseId = process.env.NOTION_SPENDING_ID;
  const apiKey = process.env.NOTION_API_KEY;

  if (!databaseId || !apiKey) return EMPTY;

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
    },
    cache: "no-store",
  });

  if (!res.ok) return EMPTY;

  const data = await res.json();
  const properties: Record<string, NotionSelectSchema> = data.properties ?? {};
  const names = (property: string) => (properties[property]?.select?.options ?? []).map((o) => o.name);

  // Store is a text property, so it has no options to offer — the form
  // suggests the stores already used in the entries instead.
  return {
    categories: names("Category"),
    paymentMethods: names("Payment Method"),
  };
}
