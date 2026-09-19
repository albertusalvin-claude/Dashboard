"use server";

import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

export type SpendingDraft = {
  item: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  paymentMethod: string;
  store: string;
};

// The same properties getSpending() reads, written back in the same shapes:
// Item is the title, Category and Payment Method are Selects, and Store and
// Notes are plain text. Notion auto-creates a Select option the first time it
// sees a new name, so a new category needs no separate step.
function propertiesFor(draft: SpendingDraft, dateStart: string): Record<string, unknown> {
  return {
    Item: { title: draft.item.trim() ? [{ text: { content: draft.item.trim() } }] : [] },
    Amount: { number: draft.amount },
    Category: { select: draft.category.trim() ? { name: draft.category.trim() } : null },
    Date: { date: dateStart ? { start: dateStart } : null },
    Notes: { rich_text: draft.notes.trim() ? [{ text: { content: draft.notes.trim() } }] : [] },
    "Payment Method": { select: draft.paymentMethod.trim() ? { name: draft.paymentMethod.trim() } : null },
    Store: { rich_text: draft.store.trim() ? [{ text: { content: draft.store.trim() } }] : [] },
  };
}

/**
 * Archives the entry, which is what Notion's own Delete does — the page moves
 * to the workspace trash and can be restored there.
 */
export async function deleteSpendingEntry(pageId: string): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is missing from .env.local." };

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ archived: true }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  revalidatePath("/money/spending");
  return { ok: true };
}

/** The message to show for an unusable draft, or null when it's fine. */
function validate(draft: SpendingDraft): string | null {
  if (!draft.item.trim()) return "An item name is required.";
  if (!Number.isFinite(draft.amount)) return "Amount must be a number.";
  if (!draft.date) return "A date is required.";
  return null;
}

/**
 * Most entries are logged with a time of day, but the form only edits the date
 * — so when the day hasn't changed, the original timestamp is kept rather than
 * flattened to midnight.
 */
async function preservedDateStart(pageId: string, apiKey: string, date: string): Promise<string> {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "Notion-Version": "2022-06-28" },
    cache: "no-store",
  });
  if (!res.ok) return date;

  const page = await res.json();
  const existing: string | undefined = page.properties?.Date?.date?.start;
  return existing && existing.slice(0, 10) === date ? existing : date;
}

export async function addSpendingEntry(draft: SpendingDraft): Promise<Result> {
  const databaseId = process.env.NOTION_SPENDING_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) {
    return { ok: false, error: "NOTION_SPENDING_ID or NOTION_API_KEY is missing from .env.local." };
  }

  const invalid = validate(draft);
  if (invalid) return { ok: false, error: invalid };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    // A new entry has no timestamp to preserve, so the date stands alone.
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: propertiesFor(draft, draft.date),
    }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  revalidatePath("/money/spending");
  return { ok: true };
}

export async function updateSpendingEntry(pageId: string, draft: SpendingDraft): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is missing from .env.local." };

  const invalid = validate(draft);
  if (invalid) return { ok: false, error: invalid };

  const dateStart = await preservedDateStart(pageId, apiKey, draft.date);

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: propertiesFor(draft, dateStart) }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };

  revalidatePath("/money/spending");
  return { ok: true };
}
