"use server";

import { revalidatePath } from "next/cache";
import type { HabitDraft, TaskDraft, TaskStatus } from "../lib/actionables";

type Result = { ok: true } | { ok: false; error: string };
/** An add also returns the new page's id, so the panel can stay open on it. */
type Created = { ok: true; id: string } | { ok: false; error: string };

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

// Notion caps each rich-text piece at 2,000 characters; longer text is split
// across pieces and getActionables joins them back.
function richText(value: string) {
  const trimmed = value.trim();
  const pieces: { text: { content: string } }[] = [];
  for (let i = 0; i < trimmed.length; i += 2000) pieces.push({ text: { content: trimmed.slice(i, i + 2000) } });
  return { rich_text: pieces };
}

const title = (value: string) => ({ title: [{ text: { content: value.trim() } }] });
const date = (value: string | null) => ({ date: value ? { start: value } : null });

// The same properties getHabits() / getTasks() read, written back in kind.
function habitProperties(draft: HabitDraft): Record<string, unknown> {
  return {
    Name: title(draft.name),
    Order: { number: draft.order },
    Category: { select: { name: draft.category } },
    "End date": date(draft.endDate),
    Description: richText(draft.description),
  };
}

function taskProperties(draft: TaskDraft): Record<string, unknown> {
  return {
    Name: title(draft.name),
    Order: { number: draft.order },
    Status: { select: { name: draft.status } },
    "Due date": date(draft.dueDate),
    Description: richText(draft.description),
    "Parent task": { relation: draft.parentId ? [{ id: draft.parentId }] : [] },
  };
}

async function createPage(envVar: string, properties: Record<string, unknown>): Promise<Created> {
  const databaseId = process.env[envVar];
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: `${envVar} or NOTION_API_KEY is missing from .env.local.` };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  revalidatePath("/actionables");
  const page = await res.json();
  return { ok: true, id: page.id };
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

async function patchAll(updates: { id: string; body: Record<string, unknown> }[]): Promise<Result> {
  const results = await Promise.all(updates.map(({ id, body }) => patchPage(id, body)));
  revalidatePath("/actionables");
  return results.find((r) => !r.ok) ?? { ok: true };
}

export async function addHabit(draft: HabitDraft): Promise<Created> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  return createPage("NOTION_HABITS_ID", habitProperties(draft));
}

export async function updateHabit(pageId: string, draft: HabitDraft): Promise<Result> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  return patchAll([{ id: pageId, body: { properties: habitProperties(draft) } }]);
}

export async function addTask(draft: TaskDraft): Promise<Created> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  return createPage("NOTION_TASKS_ID", taskProperties(draft));
}

export async function updateTask(pageId: string, draft: TaskDraft): Promise<Result> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  return patchAll([{ id: pageId, body: { properties: taskProperties(draft) } }]);
}

/** Saves a drag: new Order values, and a new Status for whatever changed group. */
export async function moveActionables(updates: { id: string; order: number; status?: TaskStatus }[]): Promise<Result> {
  return patchAll(
    updates.map(({ id, order, status }) => ({
      id,
      body: { properties: { Order: { number: order }, ...(status ? { Status: { select: { name: status } } } : {}) } },
    }))
  );
}

/**
 * Archives the pages, which is what Notion's own Delete does — they move to
 * the workspace trash and can be restored there. A task is deleted together
 * with its subtasks, so the caller passes all their ids.
 */
export async function deleteActionables(pageIds: string[]): Promise<Result> {
  return patchAll(pageIds.map((id) => ({ id, body: { archived: true } })));
}
