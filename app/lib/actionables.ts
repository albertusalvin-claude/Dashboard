// Shapes for the Actionables tab — the Habits and Tasks Notion databases.
// Pure, so the server (reading/writing Notion) and the client share it.

export const TASK_STATUSES = ["Todo", "Doing", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_COLOR: Record<TaskStatus, string> = {
  Todo: "#8A8F87",
  Doing: "#B4832A",
  Done: "#4E7043",
};

// What area of life a habit belongs to — a Select in Notion with the same
// names. Anything that isn't one of the three tabs is Other.
export const HABIT_CATEGORIES = ["Money", "Health", "Relationship", "Other"] as const;
export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export const CATEGORY_COLOR: Record<HabitCategory, string> = {
  Money: "#D9822B",
  Health: "#4E7043",
  Relationship: "#D4A72C",
  Other: "#8A8F87",
};

export function habitCategoryFrom(name: string | undefined): HabitCategory {
  return HABIT_CATEGORIES.find((c) => c.toLowerCase() === name?.trim().toLowerCase()) ?? "Other";
}

export type Habit = {
  id: string;
  name: string;
  order: number;
  category: HabitCategory;
  /** YYYY-MM-DD the habit runs until, if it has one. */
  endDate: string | null;
  description: string;
  createdTime: string;
  lastEditedTime: string;
};

export type Task = {
  id: string;
  name: string;
  order: number;
  status: TaskStatus;
  /** YYYY-MM-DD. */
  dueDate: string | null;
  description: string;
  /** Set on a subtask: the task it belongs to. */
  parentId: string | null;
  createdTime: string;
  lastEditedTime: string;
};

export type HabitDraft = Pick<Habit, "name" | "order" | "category" | "endDate" | "description">;
export type TaskDraft = Pick<Task, "name" | "order" | "status" | "dueDate" | "description" | "parentId">;

export function taskStatusFrom(name: string | undefined): TaskStatus {
  return TASK_STATUSES.find((s) => s.toLowerCase() === name?.trim().toLowerCase()) ?? "Todo";
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

/**
 * Top-level tasks grouped by status, each with its subtasks. A subtask whose
 * parent is gone (deleted in Notion, say) is shown as a top-level task rather
 * than disappearing.
 */
export function groupTasks(tasks: Task[]): Record<TaskStatus, { task: Task; subtasks: Task[] }[]> {
  const ids = new Set(tasks.map((t) => t.id));
  const isTopLevel = (t: Task) => !t.parentId || !ids.has(t.parentId);
  const groups = { Todo: [], Doing: [], Done: [] } as Record<TaskStatus, { task: Task; subtasks: Task[] }[]>;

  for (const task of tasks.filter(isTopLevel).sort(byOrder)) {
    groups[task.status].push({
      task,
      subtasks: tasks.filter((t) => t.parentId === task.id).sort(byOrder),
    });
  }
  return groups;
}

/** "31 Dec 2026" from YYYY-MM-DD, read as a calendar date (no timezone shift). */
export function formatDate(date: string | null): string {
  if (!date) return "";
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "3 Oct 2026, 2:05 pm" in the viewer's timezone — for Notion's timestamps. */
export function formatTimestamp(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
