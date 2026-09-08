"use server";

import { revalidatePath } from "next/cache";
import { createCalendarEvent } from "../lib/googleCalendar";

type Candidate = {
  name: string;
  date: string | null;
  link: string;
};

export async function acceptCandidate(candidate: Candidate) {
  if (!candidate.date) return;

  await createCalendarEvent({
    summary: candidate.name,
    description: candidate.link || undefined,
    date: candidate.date,
  });

  revalidatePath("/calendar");
}
