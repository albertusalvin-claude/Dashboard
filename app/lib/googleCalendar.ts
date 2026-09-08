export type CalendarEventSummary = {
  id: string;
  name: string;
  date: string;
  link: string;
};

type CalendarEventInput = {
  summary: string;
  description?: string;
  /** ISO date (YYYY-MM-DD). Without it there's no slot to put the event on, so callers should skip. */
  date: string;
};

type GoogleCalendarEventItem = {
  id: string;
  summary?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
};

function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function createCalendarEvent({ summary, description, date }: CalendarEventInput): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  const accessToken = await getAccessToken();
  if (!accessToken) return;

  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary,
      description,
      start: { date },
      end: { date: nextDay(date) },
    }),
  });
}

export async function listUpcomingEvents(): Promise<CalendarEventSummary[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("timeMin", new Date().toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { items?: GoogleCalendarEventItem[] };

  return (data.items ?? [])
    .map((item) => ({
      id: item.id,
      name: item.summary ?? "",
      date: item.start?.date ?? item.start?.dateTime?.slice(0, 10) ?? "",
      link: item.htmlLink ?? "",
    }))
    .filter((e) => e.name && e.date);
}
