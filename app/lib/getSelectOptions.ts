// Reads the current set of options defined on a Select property, so the UI
// can offer them as suggestions. Notion auto-creates new options when a page
// is written with a name it hasn't seen before, so this list is just for
// autocomplete — it isn't a hard constraint on what can be entered.
export async function getSelectOptions(databaseId: string | undefined, propertyName: string): Promise<string[]> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return [];

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = await res.json();
  const options = data.properties?.[propertyName]?.select?.options ?? [];
  return options.map((o: { name: string }) => o.name);
}
