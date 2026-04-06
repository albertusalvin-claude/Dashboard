"use server";

import { revalidatePath } from "next/cache";

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
