"use server";

import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

export type ShoppingDraft = {
  item: string;
  category: string;
  estPrice: number | null;
  link: string;
  notes: string;
  priority: string;
  status: string;
};

// The same properties getShoppingList() reads, written back in kind: Item is
// the title, Category/Priority/Status are Selects, Link is a URL and Notes is
// plain text.
function propertiesFor(draft: ShoppingDraft): Record<string, unknown> {
  return {
    Item: { title: draft.item.trim() ? [{ text: { content: draft.item.trim() } }] : [] },
    Category: { select: draft.category.trim() ? { name: draft.category.trim() } : null },
    "Est. Price (AUD)": { number: draft.estPrice },
    Link: { url: draft.link.trim() || null },
    Notes: { rich_text: draft.notes.trim() ? [{ text: { content: draft.notes.trim() } }] : [] },
    Priority: { select: draft.priority.trim() ? { name: draft.priority.trim() } : null },
    Status: { select: draft.status.trim() ? { name: draft.status.trim() } : null },
  };
}

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

function revalidateShopping() {
  revalidatePath("/");
  revalidatePath("/money/spending");
}

export async function addShoppingItem(draft: ShoppingDraft): Promise<Result> {
  const databaseId = process.env.NOTION_SHOPPING_LIST_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) {
    return { ok: false, error: "NOTION_SHOPPING_LIST_ID or NOTION_API_KEY is missing from .env.local." };
  }
  if (!draft.item.trim()) return { ok: false, error: "An item name is required." };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties: propertiesFor(draft) }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  revalidateShopping();
  return { ok: true };
}

/**
 * Archives the item, which is what Notion's own Delete does — the page moves
 * to the workspace trash and can be restored there.
 */
export async function deleteShoppingItem(pageId: string): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is missing from .env.local." };

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({ archived: true }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  revalidateShopping();
  return { ok: true };
}

export async function updateShoppingItem(pageId: string, draft: ShoppingDraft): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is missing from .env.local." };
  if (!draft.item.trim()) return { ok: false, error: "An item name is required." };

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({ properties: propertiesFor(draft) }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  revalidateShopping();
  return { ok: true };
}

export async function updateShoppingStatus(id: string, status: string) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) throw new Error("Missing Notion API key");

  await fetch(`https://api.notion.com/v1/pages/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        Status: { select: { name: status } },
      },
    }),
  });

  revalidatePath("/");
}
