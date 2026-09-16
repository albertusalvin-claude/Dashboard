"use server";

import { revalidatePath } from "next/cache";
import { RELATIONSHIP_PROPERTIES, type PersonField } from "../lib/getRelationships";

type Result = { ok: true } | { ok: false; error: string };

export type PersonDraft = {
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

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

// Notion creates a Select/Multi-select option the first time it sees a name it
// doesn't recognise, so a brand new interest needs no separate step — which is
// also why the form pushes the existing options so hard.
//
// An empty value clears the property rather than being skipped: on an edit,
// deleting someone's future plan has to actually delete it.
function valueFor(type: string, value: string | string[]): Record<string, unknown> {
  const list = (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean);
  const text = list.join(", ");

  switch (type) {
    case "title":
      return { title: text ? [{ text: { content: text } }] : [] };
    case "rich_text":
      return { rich_text: text ? [{ text: { content: text } }] : [] };
    case "select":
      return { select: text ? { name: text } : null };
    case "multi_select":
      return { multi_select: [...new Set(list)].map((name) => ({ name })) };
    default:
      return {};
  }
}

function propertiesFor(draft: PersonDraft): Record<string, unknown> {
  const values: Record<PersonField, string | string[]> = {
    name: draft.name,
    origin: draft.origin,
    originState: draft.originState,
    currentLocation: draft.currentLocation,
    currentState: draft.currentState,
    futurePlan: draft.futurePlan,
    futureState: draft.futureState,
    interests: draft.interests,
    occupations: draft.occupations,
    utilities: draft.utilities,
    notes: draft.notes,
  };

  const properties: Record<string, unknown> = {};
  for (const [field, { property, type }] of Object.entries(RELATIONSHIP_PROPERTIES)) {
    properties[property] = valueFor(type, values[field as PersonField]);
  }
  return properties;
}

function credentials(): { databaseId: string; apiKey: string } | null {
  const databaseId = process.env.NOTION_RELATIONSHIPS_ID;
  const apiKey = process.env.NOTION_API_KEY;
  return databaseId && apiKey ? { databaseId, apiKey } : null;
}

export async function addPerson(draft: PersonDraft): Promise<Result> {
  const env = credentials();
  if (!env) return { ok: false, error: "NOTION_RELATIONSHIPS_ID or NOTION_API_KEY is missing from .env.local." };
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(env.apiKey),
    body: JSON.stringify({
      parent: { database_id: env.databaseId },
      properties: propertiesFor(draft),
    }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  revalidatePath("/relationship/location");
  return { ok: true };
}

export async function updatePerson(pageId: string, draft: PersonDraft): Promise<Result> {
  const env = credentials();
  if (!env) return { ok: false, error: "NOTION_RELATIONSHIPS_ID or NOTION_API_KEY is missing from .env.local." };
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: NOTION_HEADERS(env.apiKey),
    body: JSON.stringify({ properties: propertiesFor(draft) }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  revalidatePath("/relationship/location");
  return { ok: true };
}
