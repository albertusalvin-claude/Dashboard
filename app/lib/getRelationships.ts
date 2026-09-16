export type Person = {
  id: string;
  name: string;
  origin: string;
  originState: string;
  currentLocation: string;
  currentState: string;
  futurePlan: string;
  futureState: string;
  interests: string[];
  occupations: string[];
  utilities: string[];
  notes: string;
};

/**
 * The shape this app expects of the Relationships database: one Notion property
 * per field, with the type it is written as. This is the convention — the form
 * writes exactly these names, so a database built to match stays consistent no
 * matter how an entry was created.
 *
 * Property names are compared ignoring case and punctuation, so "current
 * location" matches "Current Location", but nothing else is guessed at.
 */
export const RELATIONSHIP_PROPERTIES = {
  name: { property: "Name", type: "title" },
  origin: { property: "Origin", type: "select" },
  originState: { property: "Origin State/Province", type: "select" },
  currentLocation: { property: "Current Location", type: "select" },
  currentState: { property: "Current State/Province", type: "select" },
  futurePlan: { property: "Future Residency Plan", type: "select" },
  futureState: { property: "Future State/Province", type: "select" },
  interests: { property: "Interest", type: "multi_select" },
  occupations: { property: "Occupations", type: "multi_select" },
  utilities: { property: "Additional Utilities", type: "multi_select" },
  notes: { property: "Notes", type: "rich_text" },
} as const;

export type PersonField = keyof typeof RELATIONSHIP_PROPERTIES;

/** Fields whose Notion property carries a reusable list of options. */
export const OPTION_FIELDS = [
  "origin",
  "originState",
  "currentLocation",
  "currentState",
  "futurePlan",
  "futureState",
  "interests",
  "occupations",
  "utilities",
] as const satisfies readonly PersonField[];

export type OptionField = (typeof OPTION_FIELDS)[number];
export type FieldOptions = Record<OptionField, string[]>;

export function normalizePropertyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type NotionProperty = {
  type?: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  select?: { name: string } | null;
  status?: { name: string } | null;
  multi_select?: { name: string }[];
};

function findProperty(properties: Record<string, NotionProperty>, name: string): NotionProperty | undefined {
  const wanted = normalizePropertyName(name);
  for (const [key, value] of Object.entries(properties)) {
    if (normalizePropertyName(key) === wanted) return value;
  }
  return undefined;
}

// Reading stays tolerant about the property's *type* — a location typed as
// plain text instead of a Select should still show on the map — but not about
// its name.
function readText(properties: Record<string, NotionProperty>, field: PersonField): string {
  const property = findProperty(properties, RELATIONSHIP_PROPERTIES[field].property);
  if (!property) return "";
  return (
    property.select?.name ??
    property.status?.name ??
    property.title?.map((t) => t.plain_text).join("") ??
    property.rich_text?.map((t) => t.plain_text).join("") ??
    property.multi_select?.map((o) => o.name).join(", ") ??
    ""
  ).trim();
}

function readList(properties: Record<string, NotionProperty>, field: PersonField): string[] {
  const property = findProperty(properties, RELATIONSHIP_PROPERTIES[field].property);
  if (!property) return [];
  if (property.multi_select?.length) return property.multi_select.map((o) => o.name.trim()).filter(Boolean);

  // A Select or a text field still works — commas separate the entries.
  return readText(properties, field)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Whether the Notion credentials for this database are present. Lets the tab
 * tell "you haven't wired this up" apart from "nobody's in there yet", which
 * otherwise both arrive as an empty list.
 */
export function isRelationshipsConfigured(): boolean {
  return Boolean(process.env.NOTION_RELATIONSHIPS_ID && process.env.NOTION_API_KEY);
}

export async function getRelationships(): Promise<Person[]> {
  const databaseId = process.env.NOTION_RELATIONSHIPS_ID;
  const apiKey = process.env.NOTION_API_KEY;

  if (!databaseId || !apiKey) return [];

  const people: Person[] = [];
  let cursor: string | undefined;

  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      // Deliberately unsorted: sorting server-side means naming the title
      // property, and sorting by name here costs nothing.
      body: JSON.stringify(cursor ? { start_cursor: cursor } : {}),
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();

    for (const page of data.results) {
      const properties: Record<string, NotionProperty> = page.properties ?? {};
      const name = readText(properties, "name");
      if (!name) continue;

      people.push({
        id: page.id,
        name,
        origin: readText(properties, "origin"),
        originState: readText(properties, "originState"),
        currentLocation: readText(properties, "currentLocation"),
        currentState: readText(properties, "currentState"),
        futurePlan: readText(properties, "futurePlan"),
        futureState: readText(properties, "futureState"),
        interests: readList(properties, "interests"),
        occupations: readList(properties, "occupations"),
        utilities: readList(properties, "utilities"),
        notes: readText(properties, "notes"),
      });
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return people.sort((a, b) => a.name.localeCompare(b.name));
}
