export type EventType = "Movie" | "Football" | "Fight" | "Badminton";
export type EventStatus = "New" | "Accepted" | "Rejected";

export type EventEntry = {
  id: string;
  name: string;
  type: EventType;
  status: EventStatus;
  date: string | null;
  notes: string;
  link: string;
};

type NotionPage = {
  id: string;
  properties: {
    Name?: { title?: { plain_text?: string }[] };
    Type?: { select?: { name?: string } };
    Status?: { select?: { name?: string } };
    Date?: { date?: { start?: string } };
    Notes?: { rich_text?: { plain_text?: string }[] };
    Link?: { url?: string };
  };
};

export async function getEvents(type: EventType, status?: EventStatus): Promise<EventEntry[]> {
  const databaseId = process.env.NOTION_EVENTS_ID;
  const apiKey = process.env.NOTION_API_KEY;

  if (!databaseId || !apiKey) return [];

  const typeFilter = { property: "Type", select: { equals: type } };
  const filter = status
    ? { and: [typeFilter, { property: "Status", select: { equals: status } }] }
    : typeFilter;

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter,
      sorts: [{ property: "Date", direction: "ascending" }],
    }),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { results: NotionPage[] };

  return data.results
    .map((page): EventEntry => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.plain_text ?? "",
        type: (props.Type?.select?.name ?? type) as EventType,
        status: (props.Status?.select?.name ?? "New") as EventStatus,
        date: props.Date?.date?.start ?? null,
        notes: props.Notes?.rich_text?.[0]?.plain_text ?? "",
        link: props.Link?.url ?? "",
      };
    })
    .filter((e) => e.name);
}
