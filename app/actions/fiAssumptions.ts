"use server";

import { revalidatePath } from "next/cache";
import { FI_FIELDS, type FIAssumptions } from "../lib/fiProjection";

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

async function findOrCreatePageId(databaseId: string, apiKey: string): Promise<string | null> {
  const query = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({ page_size: 1 }),
    cache: "no-store",
  });
  if (!query.ok) return null;

  const data = await query.json();
  if (data.results?.[0]) return data.results[0].id as string;

  // Empty database — create the single settings row.
  const created = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: { Name: { title: [{ text: { content: "Current" } }] } },
    }),
  });
  if (!created.ok) return null;

  const createdPage = await created.json();
  return createdPage.id ?? null;
}

export async function saveFIAssumptions(
  assumptions: FIAssumptions
): Promise<{ ok: true } | { ok: false; error: string }> {
  const databaseId = process.env.NOTION_MONEY_PROJECTION_ASSUMPTIONS_ID;
  const apiKey = process.env.NOTION_API_KEY;

  if (!databaseId || !apiKey) {
    return { ok: false, error: "NOTION_MONEY_PROJECTION_ASSUMPTIONS_ID (or NOTION_API_KEY) is not set." };
  }

  const pageId = await findOrCreatePageId(databaseId, apiKey);
  if (!pageId) {
    return { ok: false, error: "Couldn't find or create the settings row in Notion." };
  }

  const properties: Record<string, { number: number }> = {};
  for (const field of FI_FIELDS) {
    const value = assumptions[field.key];
    properties[field.notionProperty] = { number: field.percent ? value * 100 : value };
  }

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }

  revalidatePath("/money/projection");
  return { ok: true };
}
