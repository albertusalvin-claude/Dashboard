"use server";

import { revalidatePath } from "next/cache";
import {
  GENERAL_PROJECT,
  HABIT_STATUSES,
  projectList,
  projectNameError,
  type HabitDraft,
  type HabitStatus,
  type TaskDraft,
  type TaskStatus,
} from "../lib/actionables";
import { getTasks } from "../lib/getActionables";

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
    Status: { select: { name: draft.status } },
    Category: { select: { name: draft.category } },
    "End date": date(draft.endDate),
    Description: richText(draft.description),
  };
}

// General is stored as no project, so tasks made in Notion land there too.
const project = (name: string) => ({ select: name === GENERAL_PROJECT ? null : { name } });

function taskProperties(draft: TaskDraft): Record<string, unknown> {
  return {
    Name: title(draft.name),
    Order: { number: draft.order },
    Status: { select: { name: draft.status } },
    Project: project(draft.project),
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

// Columns found (or made) since the server started, so each is checked once.
const ensured = new Set<string>();

/**
 * Makes sure the database has a Select column of this name before a page
 * writes to it. Notion adds new options to a select by itself, but rejects a
 * write to a column that doesn't exist — Habits had no Status until this
 * dashboard gave them one.
 */
async function ensureSelectColumn(envVar: string, name: string): Promise<Result> {
  const key = `${envVar}:${name}`;
  if (ensured.has(key)) return { ok: true };
  const databaseId = process.env[envVar];
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: `${envVar} or NOTION_API_KEY is missing from .env.local.` };

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: NOTION_HEADERS(apiKey),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  const existing = (await res.json()).properties?.[name];

  if (existing && existing.type !== "select") {
    return { ok: false, error: `${name} in Notion is a ${existing.type} column; the dashboard needs it to be a Select.` };
  }
  if (!existing) {
    const created = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: "PATCH",
      headers: NOTION_HEADERS(apiKey),
      body: JSON.stringify({ properties: { [name]: { select: {} } } }),
    });
    if (!created.ok) return { ok: false, error: await created.text() };
  }
  ensured.add(key);
  return { ok: true };
}

const ensureHabitStatus = () => ensureSelectColumn("NOTION_HABITS_ID", "Status");
const ensureTaskProject = () => ensureSelectColumn("NOTION_TASKS_ID", "Project");

export async function addHabit(draft: HabitDraft): Promise<Created> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  const column = await ensureHabitStatus();
  if (!column.ok) return column;
  return createPage("NOTION_HABITS_ID", habitProperties(draft));
}

export async function updateHabit(pageId: string, draft: HabitDraft): Promise<Result> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  const column = await ensureHabitStatus();
  if (!column.ok) return column;
  return patchAll([{ id: pageId, body: { properties: habitProperties(draft) } }]);
}

export async function addTask(draft: TaskDraft): Promise<Created> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  const column = await ensureTaskProject();
  if (!column.ok) return column;
  return createPage("NOTION_TASKS_ID", taskProperties(draft));
}

/** Subtasks are passed so they move with their parent to its project. */
export async function updateTask(pageId: string, draft: TaskDraft, subtaskIds: string[] = []): Promise<Result> {
  if (!draft.name.trim()) return { ok: false, error: "A name is required." };
  const column = await ensureTaskProject();
  if (!column.ok) return column;
  return patchAll([
    { id: pageId, body: { properties: taskProperties(draft) } },
    ...subtaskIds.map((id) => ({ id, body: { properties: { Project: project(draft.project) } } })),
  ]);
}

/** Saves a drag: new Order values, and a new Status for whatever changed group. */
export async function moveActionables(
  updates: { id: string; order: number; status?: TaskStatus | HabitStatus }[]
): Promise<Result> {
  // Habit and task statuses don't share names, so this tells them apart.
  if (updates.some((u) => (HABIT_STATUSES as readonly string[]).includes(u.status ?? ""))) {
    const column = await ensureHabitStatus();
    if (!column.ok) return column;
  }
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

const ARCHIVED_PROJECTS = "Archived projects";

type SelectOption = { id?: string; name: string; color?: string };
type Options = { projects: SelectOption[]; archived: SelectOption[] };

// The Tasks database keeps projects as the options of its Project select, and
// archived ones as the options of an "Archived projects" multi-select. Either
// is empty (not an error) when its property doesn't exist yet.
async function projectOptions(): Promise<({ ok: true } & Options) | { ok: false; error: string }> {
  const databaseId = process.env.NOTION_TASKS_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: "NOTION_TASKS_ID or NOTION_API_KEY is missing from .env.local." };

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: NOTION_HEADERS(apiKey),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  const data = await res.json();
  return {
    ok: true,
    projects: data.properties?.Project?.select?.options ?? [],
    archived: data.properties?.[ARCHIVED_PROJECTS]?.multi_select?.options ?? [],
  };
}

// Replaces the options of either list, creating its property the first time.
async function setOptions(options: Partial<Options>): Promise<Result> {
  const databaseId = process.env.NOTION_TASKS_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { ok: false, error: "NOTION_TASKS_ID or NOTION_API_KEY is missing from .env.local." };

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    method: "PATCH",
    headers: NOTION_HEADERS(apiKey),
    body: JSON.stringify({
      properties: {
        ...(options.projects ? { Project: { select: { options: options.projects } } } : {}),
        ...(options.archived ? { [ARCHIVED_PROJECTS]: { multi_select: { options: options.archived } } } : {}),
      },
    }),
  });
  revalidatePath("/actionables");
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

async function currentProjects() {
  const [current, tasks] = await Promise.all([projectOptions(), getTasks()]);
  if (!current.ok) return current;
  return { ...current, tasks, names: projectList([...current.projects.map((o) => o.name), ...tasks.map((t) => t.project)]) };
}

const without = (options: SelectOption[], name: string) => options.filter((o) => o.name !== name);

export async function addProject(name: string): Promise<Result> {
  const current = await currentProjects();
  if (!current.ok) return current;
  const problem = projectNameError(name, current.names);
  if (problem) return { ok: false, error: problem };
  return setOptions({ projects: [...current.projects, { name: name.trim() }] });
}

/**
 * Moves the project's tasks to the new name (Notion adds it as an option when
 * the first one is written), then swaps the old option for it. An archived
 * project stays archived.
 */
export async function renameProject(from: string, to: string): Promise<Result> {
  if (from === GENERAL_PROJECT) return { ok: false, error: "General can't be renamed." };
  const current = await currentProjects();
  if (!current.ok) return current;
  const problem = projectNameError(to, current.names, from);
  if (problem) return { ok: false, error: problem };
  const name = to.trim();

  const moved = await patchAll(
    current.tasks.filter((t) => t.project === from).map((t) => ({ id: t.id, body: { properties: { Project: project(name) } } }))
  );
  if (!moved.ok) return moved;

  const after = await projectOptions();
  if (!after.ok) return after;
  const projects = without(after.projects, from);
  const wasArchived = after.archived.some((o) => o.name === from);
  return setOptions({
    projects: projects.some((o) => o.name === name) ? projects : [...projects, { name }],
    ...(wasArchived ? { archived: [...without(after.archived, from), { name }] } : {}),
  });
}

/** Deletes the project; its tasks aren't deleted but move to General. */
export async function deleteProject(name: string): Promise<Result> {
  if (name === GENERAL_PROJECT) return { ok: false, error: "General can't be deleted." };
  const current = await currentProjects();
  if (!current.ok) return current;

  const moved = await patchAll(
    current.tasks.filter((t) => t.project === name).map((t) => ({ id: t.id, body: { properties: { Project: project(GENERAL_PROJECT) } } }))
  );
  if (!moved.ok) return moved;
  const isArchived = current.archived.some((o) => o.name === name);
  return setOptions({ projects: without(current.projects, name), ...(isArchived ? { archived: without(current.archived, name) } : {}) });
}

/** Archiving hides a project and its tasks from All; its tasks are kept as they are. */
export async function setProjectArchived(name: string, archived: boolean): Promise<Result> {
  if (name === GENERAL_PROJECT) return { ok: false, error: "General can't be archived." };
  const current = await projectOptions();
  if (!current.ok) return current;
  const rest = without(current.archived, name);
  return setOptions({ archived: archived ? [...rest, { name }] : rest });
}
