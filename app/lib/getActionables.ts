import {
  habitCategoryFrom,
  habitStatusFrom,
  projectList,
  taskProjectFrom,
  taskStatusFrom,
  type Habit,
  type Projects,
  type Task,
} from "./actionables";
import { bringBackRecurring, parseRepeat } from "./recurrence";

export function isHabitsConfigured(): boolean {
  return Boolean(process.env.NOTION_HABITS_ID && process.env.NOTION_API_KEY);
}

export function isTasksConfigured(): boolean {
  return Boolean(process.env.NOTION_TASKS_ID && process.env.NOTION_API_KEY);
}

type RichText = { plain_text: string }[];
type NotionProperty = {
  title?: RichText;
  rich_text?: RichText;
  number?: number | null;
  select?: { name: string } | null;
  date?: { start: string } | null;
  relation?: { id: string }[];
};
type NotionPage = {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, NotionProperty | undefined>;
};

// Read in saved Order, oldest first among ties, so a row added in Notion
// without an Order still lands somewhere stable. Follows pagination: the
// Done pile only grows.
async function queryAll(databaseId: string | undefined): Promise<NotionPage[]> {
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
      body: JSON.stringify({
        sorts: [
          { property: "Order", direction: "ascending" },
          { timestamp: "created_time", direction: "ascending" },
        ],
        start_cursor: cursor,
      }),
      cache: "no-store",
    });
    if (!res.ok) return pages;
    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

const text = (prop: NotionProperty | undefined): string =>
  (prop?.rich_text ?? prop?.title ?? []).map((t) => t.plain_text).join("");

export async function getHabits(): Promise<Habit[]> {
  const pages = await queryAll(process.env.NOTION_HABITS_ID);
  return pages
    .map((page, index) => {
      const p = page.properties;
      return {
        id: page.id,
        name: text(p.Name),
        order: p.Order?.number ?? index,
        status: habitStatusFrom(p.Status?.select?.name),
        category: habitCategoryFrom(p.Category?.select?.name),
        endDate: p["End date"]?.date?.start ?? null,
        description: text(p.Description),
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    })
    .filter((h) => h.name);
}

export async function getTasks(): Promise<Task[]> {
  const pages = await queryAll(process.env.NOTION_TASKS_ID);
  return pages
    .map((page, index) => {
      const p = page.properties;
      return {
        id: page.id,
        name: text(p.Name),
        order: p.Order?.number ?? index,
        status: taskStatusFrom(p.Status?.select?.name),
        project: taskProjectFrom(p.Project?.select?.name),
        dueDate: p["Due date"]?.date?.start ?? null,
        description: text(p.Description),
        parentId: p["Parent task"]?.relation?.[0]?.id ?? null,
        repeat: parseRepeat(text(p.Repeat)),
        completedOn: p.Completed?.date?.start?.slice(0, 10) ?? null,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    })
    .filter((t) => t.name);
}

/**
 * Moves recurring tasks that are due again back to Todo in Notion, and
 * returns the tasks as they now stand. Runs as the tab loads, so a task comes
 * back the first time it's opened on or after its next date. One that fails
 * to save stays as it was, and is tried again next load.
 */
export async function returnRecurringTasks(tasks: Task[], today: string): Promise<Task[]> {
  const apiKey = process.env.NOTION_API_KEY;
  const returned = bringBackRecurring(tasks, today);
  if (!apiKey || returned.changes.length === 0) return tasks;

  // Saving the move of recuring tasks back into notion
  const saved = await Promise.all(
    returned.changes.map(async ({ id, dueDate }) => {
      // Back in Todo, so no longer completed. Only cleared when it was set,
      // since a database without the column would reject the write.
      const wasCompleted = tasks.find((t) => t.id === id)?.completedOn;
      const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            Status: { select: { name: "Todo" } },
            ...(dueDate ? { "Due date": { date: { start: dueDate } } } : {}),
            ...(wasCompleted ? { Completed: { date: null } } : {}),
          },
        }),
      });
      return res.ok ? id : null;
    })
  );
  const ok = new Set(saved);
  return returned.tasks.map((t, i) => (ok.has(t.id) ? t : tasks[i]));
}

type Options = { options?: { name: string }[] };

/**
 * Every project: the options on the Tasks database's Project select (so an
 * empty project still shows), plus any a task uses that isn't one of them.
 * Archived ones are the options of its "Archived projects" multi-select.
 */
export async function getTaskProjects(tasks: Task[]): Promise<Projects> {
  const used = tasks.map((t) => t.project);
  const databaseId = process.env.NOTION_TASKS_ID;
  const apiKey = process.env.NOTION_API_KEY;
  if (!databaseId || !apiKey) return { all: projectList(used), archived: [] };

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "Notion-Version": "2022-06-28" },
    cache: "no-store",
  });
  if (!res.ok) return { all: projectList(used), archived: [] };

  const data = await res.json();
  const project: Options = data.properties?.Project?.select ?? {};
  const archived: Options = data.properties?.["Archived projects"]?.multi_select ?? {};
  const all = projectList([...(project.options ?? []).map((o) => o.name), ...used]);
  return { all, archived: (archived.options ?? []).map((o) => o.name).filter((n) => all.includes(n)) };
}
