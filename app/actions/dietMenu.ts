"use server";

import { revalidatePath } from "next/cache";
import {
  DISH_MENU_ENV,
  DISH_TYPE_LABEL,
  batchCost,
  formatCostLines,
  formatSmoothieIngredients,
  smoothieTotals,
  type DishDraft,
  type DishMenuKind,
  type SmoothieDraft,
} from "../lib/dietMenu";

type Result = { ok: true } | { ok: false; error: string };

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

function revalidateDiet() {
  revalidatePath("/health/diet");
}

// Notion caps each rich-text piece at 2,000 characters; longer text is split
// across pieces and getDietMenu joins them back.
function richText(value: string) {
  const trimmed = value.trim();
  const pieces: { text: { content: string } }[] = [];
  for (let i = 0; i < trimmed.length; i += 2000) pieces.push({ text: { content: trimmed.slice(i, i + 2000) } });
  return { rich_text: pieces };
}

const title = (value: string) => ({ title: [{ text: { content: value.trim() } }] });

// Cost per portion is derived from the breakdown on every save, so Notion can
// sort and sum by it; the app itself always recomputes from the breakdown.
const cents = (n: number | null) => ({ number: n === null ? null : Math.round(n * 100) / 100 });

// The same properties getSmoothies() / getDishes() read, written back in kind.
function smoothieProperties(draft: SmoothieDraft): Record<string, unknown> {
  return {
    Name: title(draft.name),
    Order: { number: draft.order },
    Description: richText(draft.description),
    Ingredients: richText(formatSmoothieIngredients(draft.ingredients)),
    "Cost per portion": cents(draft.ingredients.some((i) => i.cost !== null) ? smoothieTotals(draft.ingredients).cost : null),
    "Cost note": richText(draft.costNote),
    "Nutrition note": richText(draft.nutritionNote),
  };
}

function dishProperties(draft: DishDraft): Record<string, unknown> {
  return {
    Name: title(draft.name),
    Order: { number: draft.order },
    Type: { select: { name: DISH_TYPE_LABEL[draft.type] } },
    Notes: richText(draft.notes),
    Portions: { number: draft.portions },
    "Cost breakdown": richText(formatCostLines(draft.costItems)),
    "Cost per portion": cents(draft.costItems.length > 0 ? batchCost(draft).perServe : null),
    "Cost note": richText(draft.costNote),
    Calories: { number: draft.nutrition.calories },
    Protein: { number: draft.nutrition.protein },
    Fat: { number: draft.nutrition.fat },
    Carbs: { number: draft.nutrition.carbs },
    Fiber: { number: draft.nutrition.fiber },
    "Nutrition note": richText(draft.nutritionNote),
  };
}

async function createPage(envVar: string, properties: Record<string, unknown>): Promise<Result> {
  const databaseId = process.env[envVar];
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: `${envVar} or NOTION_API_KEY is missing from .env.local.` };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  revalidateDiet();
  return { ok: true };
}

async function patchPage(pageId: string, body: Record<string, unknown>): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is missing from .env.local." };

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

export async function addSmoothie(draft: SmoothieDraft): Promise<Result> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  return createPage("NOTION_SMOOTHIES_ID", smoothieProperties(draft));
}

export async function updateSmoothie(pageId: string, draft: SmoothieDraft): Promise<Result> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  const result = await patchPage(pageId, { properties: smoothieProperties(draft) });
  if (result.ok) revalidateDiet();
  return result;
}

export async function addDish(kind: DishMenuKind, draft: DishDraft): Promise<Result> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  return createPage(DISH_MENU_ENV[kind], dishProperties(draft));
}

export async function updateDish(pageId: string, draft: DishDraft): Promise<Result> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  const result = await patchPage(pageId, { properties: dishProperties(draft) });
  if (result.ok) revalidateDiet();
  return result;
}

/**
 * Archives the item, which is what Notion's own Delete does — the page moves
 * to the workspace trash and can be restored there. Works for any of the menu databases.
 */
export async function deleteMenuItem(pageId: string): Promise<Result> {
  const result = await patchPage(pageId, { archived: true });
  if (result.ok) revalidateDiet();
  return result;
}

/** Writes new Order values; the caller sends only the rows whose order changed. */
export async function reorderMenuItems(updates: { id: string; order: number }[]): Promise<Result> {
  const results = await Promise.all(
    updates.map(({ id, order }) => patchPage(id, { properties: { Order: { number: order } } }))
  );
  revalidateDiet();
  return results.find((r) => !r.ok) ?? { ok: true };
}
