"use server";

import { revalidatePath } from "next/cache";
import { createCalendarEvent } from "../lib/googleCalendar";

type EventDetails = {
  name: string;
  date: string | null;
  link: string;
};

export async function updateEventStatus(id: string, status: "Accepted" | "Rejected", event?: EventDetails) {
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

  if (status === "Accepted" && event?.date) {
    await createCalendarEvent({
      summary: event.name,
      description: event.link || undefined,
      date: event.date,
    });
  }

  revalidatePath("/movies");
}
