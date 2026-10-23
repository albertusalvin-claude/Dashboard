"use server";

import { revalidatePath } from "next/cache";
import { reviewError, type PhotoChange, type ReviewDraft } from "../lib/reviews";

type Result = { ok: true } | { ok: false; error: string };

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

// Notion caps each rich-text piece at 2,000 characters; longer notes are
// split across pieces and getReviews joins them back.
function richText(value: string) {
  const trimmed = value.trim();
  const pieces: { text: { content: string } }[] = [];
  for (let i = 0; i < trimmed.length; i += 2000) pieces.push({ text: { content: trimmed.slice(i, i + 2000) } });
  return { rich_text: pieces };
}

// The same properties getReviews() reads, written back in kind. Notion adds a
// Category option the first time it sees a new name.
function propertiesFor(draft: ReviewDraft): Record<string, unknown> {
  return {
    Name: { title: [{ text: { content: draft.name.trim() } }] },
    Type: { select: { name: draft.type } },
    Category: { select: draft.category.trim() ? { name: draft.category.trim() } : null },
    Rating: { number: draft.rating },
    Price: { number: draft.price },
    "Worth it": { checkbox: draft.worthIt },
    "Would purchase again": { checkbox: draft.wouldPurchaseAgain },
    Date: { date: draft.date ? { start: draft.date } : null },
    "Spending entry": { relation: draft.spendingId ? [{ id: draft.spendingId }] : [] },
    Notes: richText(draft.notes),
  };
}

// Photos are shrunk in the browser first; this is a backstop well inside
// what a Server Action accepts.
const MAX_PHOTO_BYTES = 950_000;

/**
 * Uploads a photo with Notion's file upload API and returns the Image
 * column's value pointing at it: create the upload, send the bytes, then the
 * page references it by id.
 */
async function photoProperty(photo: FormData, apiKey: string): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const file = photo.get("photo");
  if (!(file instanceof File)) return { ok: false, error: "No photo was sent." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "That file isn't an image." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "That photo is too large to upload." };

  const created = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({ filename: file.name, content_type: file.type }),
  });
  if (!created.ok) return { ok: false, error: await created.text() };
  const { id } = await created.json();

  const body = new FormData();
  body.append("file", file, file.name);
  // No Content-Type here: fetch sets the multipart boundary itself.
  const sent = await fetch(`https://api.notion.com/v1/file_uploads/${id}/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Notion-Version": "2022-06-28" },
    body,
  });
  if (!sent.ok) return { ok: false, error: await sent.text() };

  return { ok: true, value: { files: [{ type: "file_upload", file_upload: { id }, name: file.name }] } };
}

/** The Image column's new value for a change, or undefined to leave it. */
async function imageFor(change: PhotoChange, apiKey: string): Promise<{ ok: true; value?: unknown } | { ok: false; error: string }> {
  if (change.kind === "keep") return { ok: true };
  if (change.kind === "remove") return { ok: true, value: { files: [] } };
  return photoProperty(change.photo, apiKey);
}

async function notion(path: string, method: "POST" | "PATCH", body: unknown): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is missing from .env.local." };
  const res = await fetch(`https://api.notion.com/v1${path}`, { method, headers: NOTION_HEADERS(apiKey), body: JSON.stringify(body) });
  if (!res.ok) return { ok: false, error: await res.text() };
  revalidatePath("/experience");
  return { ok: true };
}

/** The page's properties for a save, with the photo uploaded first if there's a new one. */
async function propertiesWithImage(draft: ReviewDraft, change: PhotoChange) {
  const problem = reviewError(draft);
  if (problem) return { ok: false as const, error: problem };
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false as const, error: "NOTION_API_KEY is missing from .env.local." };
  const image = await imageFor(change, apiKey);
  if (!image.ok) return image;
  const properties = propertiesFor(draft);
  return { ok: true as const, properties: image.value === undefined ? properties : { ...properties, Image: image.value } };
}

export async function addReview(draft: ReviewDraft, change: PhotoChange): Promise<Result> {
  const databaseId = process.env.NOTION_REVIEWS_ID;
  if (!databaseId) return { ok: false, error: "NOTION_REVIEWS_ID is missing from .env.local." };
  const prepared = await propertiesWithImage(draft, change);
  if (!prepared.ok) return prepared;
  return notion("/pages", "POST", { parent: { database_id: databaseId }, properties: prepared.properties });
}

export async function updateReview(pageId: string, draft: ReviewDraft, change: PhotoChange): Promise<Result> {
  const prepared = await propertiesWithImage(draft, change);
  if (!prepared.ok) return prepared;
  return notion(`/pages/${pageId}`, "PATCH", { properties: prepared.properties });
}

/**
 * Archives the review, which is what Notion's own Delete does — it moves to
 * the workspace trash and can be restored there.
 */
export async function deleteReview(pageId: string): Promise<Result> {
  return notion(`/pages/${pageId}`, "PATCH", { archived: true });
}
