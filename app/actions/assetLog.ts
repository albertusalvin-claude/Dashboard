"use server";

import { revalidatePath } from "next/cache";

const NOTION_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
});

type Result = { ok: true } | { ok: false; error: string };

function revalidateLogPages() {
  revalidatePath("/money/logs");
  revalidatePath("/money/projection");
}

function richText(value: string) {
  return { rich_text: [{ text: { content: value } }] };
}

// Notion auto-creates a new option in the property's schema the first time
// it sees a name it doesn't recognize (as long as the integration has write
// access, which it does here) — so this needs no separate "create option" step.
function select(name: string) {
  return { select: { name } };
}

async function createPage(databaseId: string, apiKey: string, name: string, properties: Record<string, unknown>): Promise<Result> {
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: { Entry: { title: [{ text: { content: name } }] }, ...properties },
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  revalidateLogPages();
  return { ok: true };
}

async function updatePage(pageId: string, apiKey: string, name: string, properties: Record<string, unknown>): Promise<Result> {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({
      properties: { Entry: { title: [{ text: { content: name } }] }, ...properties },
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  revalidateLogPages();
  return { ok: true };
}

// --- Investments Log ---

export async function addInvestmentLogEntry(input: {
  date: string;
  broker: string;
  ticker: string;
  value: number;
}): Promise<Result> {
  const databaseId = process.env.NOTION_INVESTMENTS_VALUE_LOG_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: "NOTION_INVESTMENTS_VALUE_LOG_ID (or NOTION_API_KEY) is not set." };

  return createPage(databaseId, apiKey, `${input.broker} · ${input.ticker} · ${input.date}`, {
    Date: { date: { start: input.date } },
    Broker: select(input.broker),
    "Stock/ETF/Cash": select(input.ticker),
    "Value (AUD)": { number: input.value },
  });
}

export async function updateInvestmentLogEntry(input: {
  id: string;
  date: string;
  broker: string;
  ticker: string;
  value: number;
}): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is not set." };

  return updatePage(input.id, apiKey, `${input.broker} · ${input.ticker} · ${input.date}`, {
    Date: { date: { start: input.date } },
    Broker: select(input.broker),
    "Stock/ETF/Cash": select(input.ticker),
    "Value (AUD)": { number: input.value },
  });
}

// --- Savings Log ---

export async function addSavingsLogEntry(input: {
  date: string;
  bank: string;
  account: string;
  value: number;
}): Promise<Result> {
  const databaseId = process.env.NOTION_SAVINGS_LOG_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: "NOTION_SAVINGS_LOG_ID (or NOTION_API_KEY) is not set." };

  return createPage(databaseId, apiKey, `${input.bank} · ${input.account} · ${input.date}`, {
    Date: { date: { start: input.date } },
    Bank: select(input.bank),
    Account: select(input.account),
    "Value (AUD)": { number: input.value },
  });
}

export async function updateSavingsLogEntry(input: {
  id: string;
  date: string;
  bank: string;
  account: string;
  value: number;
}): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is not set." };

  return updatePage(input.id, apiKey, `${input.bank} · ${input.account} · ${input.date}`, {
    Date: { date: { start: input.date } },
    Bank: select(input.bank),
    Account: select(input.account),
    "Value (AUD)": { number: input.value },
  });
}

// --- Superannuation Log ---

export async function addSuperannuationLogEntry(input: {
  date: string;
  provider: string;
  value: number;
}): Promise<Result> {
  const databaseId = process.env.NOTION_SUPERANNUATION_LOG_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: "NOTION_SUPERANNUATION_LOG_ID (or NOTION_API_KEY) is not set." };

  return createPage(databaseId, apiKey, `${input.provider} · ${input.date}`, {
    Date: { date: { start: input.date } },
    Provider: select(input.provider),
    "Value (AUD)": { number: input.value },
  });
}

export async function updateSuperannuationLogEntry(input: {
  id: string;
  date: string;
  provider: string;
  value: number;
}): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is not set." };

  return updatePage(input.id, apiKey, `${input.provider} · ${input.date}`, {
    Date: { date: { start: input.date } },
    Provider: select(input.provider),
    "Value (AUD)": { number: input.value },
  });
}

// --- Stock Options Log ---

export async function addStockOptionsLogEntry(input: {
  date: string;
  employer: string;
  grant: string;
  value: number;
}): Promise<Result> {
  const databaseId = process.env.NOTION_STOCK_OPTIONS_LOG_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: "NOTION_STOCK_OPTIONS_LOG_ID (or NOTION_API_KEY) is not set." };

  return createPage(databaseId, apiKey, `${input.employer} · ${input.grant} · ${input.date}`, {
    Date: { date: { start: input.date } },
    Employer: select(input.employer),
    Grant: richText(input.grant),
    "Value (AUD)": { number: input.value },
  });
}

export async function updateStockOptionsLogEntry(input: {
  id: string;
  date: string;
  employer: string;
  grant: string;
  value: number;
}): Promise<Result> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return { ok: false, error: "NOTION_API_KEY is not set." };

  return updatePage(input.id, apiKey, `${input.employer} · ${input.grant} · ${input.date}`, {
    Date: { date: { start: input.date } },
    Employer: select(input.employer),
    Grant: richText(input.grant),
    "Value (AUD)": { number: input.value },
  });
}
