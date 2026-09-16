import {
  OPTION_FIELDS,
  RELATIONSHIP_PROPERTIES,
  normalizePropertyName,
  type FieldOptions,
} from "./getRelationships";

type NotionPropertySchema = {
  select?: { options?: { name: string }[] };
  multi_select?: { options?: { name: string }[] };
};

const EMPTY: FieldOptions = {
  origin: [],
  originState: [],
  currentLocation: [],
  currentState: [],
  futurePlan: [],
  futureState: [],
  interests: [],
  occupations: [],
  utilities: [],
};

/**
 * The options already defined on each Select/Multi-select property, in one
 * request. The form offers these first so re-entering "Melbourne" reuses the
 * existing option instead of creating a near-duplicate.
 */
export async function getRelationshipOptions(): Promise<FieldOptions> {
  const databaseId = process.env.NOTION_RELATIONSHIPS_ID;
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
  const properties: Record<string, NotionPropertySchema> = data.properties ?? {};
  const byName = new Map(Object.entries(properties).map(([name, schema]) => [normalizePropertyName(name), schema]));

  const options = { ...EMPTY };
  for (const field of OPTION_FIELDS) {
    const schema = byName.get(normalizePropertyName(RELATIONSHIP_PROPERTIES[field].property));
    const defined = schema?.select?.options ?? schema?.multi_select?.options ?? [];
    options[field] = defined.map((o) => o.name);
  }

  return options;
}
