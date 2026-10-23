import { reviewTypeFrom, type Review } from "./reviews";

export function isReviewsConfigured(): boolean {
  return Boolean(process.env.NOTION_REVIEWS_ID && process.env.NOTION_API_KEY);
}

type RichText = { plain_text: string }[];
type NotionProperty = {
  title?: RichText;
  rich_text?: RichText;
  number?: number | null;
  select?: { name: string } | null;
  checkbox?: boolean;
  date?: { start: string } | null;
  relation?: { id: string }[];
  files?: { name: string; type: "file" | "external"; file?: { url: string }; external?: { url: string } }[];
};
type NotionPage = { id: string; properties: Record<string, NotionProperty | undefined> };

const text = (prop: NotionProperty | undefined): string =>
  (prop?.rich_text ?? prop?.title ?? []).map((t) => t.plain_text).join("");

// The first file in the Image column: uploaded to Notion, or a link.
function imageFrom(prop: NotionProperty | undefined): Review["image"] {
  const file = prop?.files?.[0];
  const url = file?.file?.url ?? file?.external?.url;
  return file && url ? { url, name: file.name } : null;
}

/** Every review, following Notion's paging. The page sorts them for display. */
export async function getReviews(): Promise<Review[]> {
  const databaseId = process.env.NOTION_REVIEWS_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return [];

  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ start_cursor: cursor }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return pages
    .map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        name: text(p.Name),
        type: reviewTypeFrom(p.Type?.select?.name),
        category: p.Category?.select?.name ?? "",
        rating: p.Rating?.number ?? null,
        price: p.Price?.number ?? null,
        worthIt: p["Worth it"]?.checkbox ?? false,
        wouldPurchaseAgain: p["Would purchase again"]?.checkbox ?? false,
        date: p.Date?.date?.start?.slice(0, 10) ?? null,
        spendingId: p["Spending entry"]?.relation?.[0]?.id ?? null,
        notes: text(p.Notes),
        image: imageFrom(p.Image),
      };
    })
    .filter((r) => r.name);
}
