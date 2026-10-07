// Shapes for the Actionables tab — the Habits and Tasks Notion databases.
// Pure, so the server (reading/writing Notion) and the client share it.

export const TASK_STATUSES = ["Todo", "Doing", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_COLOR: Record<TaskStatus, string> = {
  Todo: "#8A8F87",
  Doing: "#B4832A",
  Done: "#4E7043",
};

// Where a habit stands — a Select in Notion called Status. Active is the
// default, so habits made in Notion without one show as they always have.
export const HABIT_STATUSES = ["Active", "Backlog", "Archived"] as const;
export type HabitStatus = (typeof HABIT_STATUSES)[number];

export const HABIT_STATUS_COLOR: Record<HabitStatus, string> = {
  Active: "#4E7043",
  Backlog: "#B4832A",
  Archived: "#8A8F87",
};

export function habitStatusFrom(name: string | undefined): HabitStatus {
  return HABIT_STATUSES.find((s) => s.toLowerCase() === name?.trim().toLowerCase()) ?? "Active";
}

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

// Tasks belong to a project — a Select in Notion. A task with no project is
// in General, which always exists and can't be renamed or deleted.
export const GENERAL_PROJECT = "General";

/** General first, then the projects defined in Notion, without duplicates. */
export function projectList(names: string[]): string[] {
  const rest = names.map((n) => n.trim()).filter((n) => n && n.toLowerCase() !== GENERAL_PROJECT.toLowerCase());
  return [GENERAL_PROJECT, ...new Set(rest)];
}

export type Projects = {
  /** Every project, archived or not, General first. */
  all: string[];
  /** Hidden from All and from the project picker until unarchived. */
  archived: string[];
};

export function taskProjectFrom(name: string | undefined): string {
  return name?.trim() || GENERAL_PROJECT;
}

/** Why a project name can't be used, or null if it can. */
export function projectNameError(name: string, projects: string[], current?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "A project needs a name.";
  // Notion's select options can't contain commas.
  if (trimmed.includes(",")) return "Project names can't contain commas.";
  const taken = projects.some(
    (p) => p.toLowerCase() === trimmed.toLowerCase() && p.toLowerCase() !== current?.toLowerCase()
  );
  return taken ? `There's already a project called ${trimmed}.` : null;
}

export type Habit = {
  id: string;
  name: string;
  order: number;
  status: HabitStatus;
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
  /** A subtask shows under its parent, whatever its own project says. */
  project: string;
  /** YYYY-MM-DD. */
  dueDate: string | null;
  description: string;
  /** Set on a subtask: the task it belongs to. */
  parentId: string | null;
  createdTime: string;
  lastEditedTime: string;
};

export type HabitDraft = Pick<Habit, "name" | "order" | "status" | "category" | "endDate" | "description">;
export type TaskDraft = Pick<Task, "name" | "order" | "status" | "project" | "dueDate" | "description" | "parentId">;

export function taskStatusFrom(name: string | undefined): TaskStatus {
  return TASK_STATUSES.find((s) => s.toLowerCase() === name?.trim().toLowerCase()) ?? "Todo";
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

/** Habits grouped by status, each group in order. */
export function groupHabits(habits: Habit[]): Record<HabitStatus, Habit[]> {
  const groups = { Active: [], Backlog: [], Archived: [] } as Record<HabitStatus, Habit[]>;
  for (const habit of [...habits].sort(byOrder)) groups[habit.status].push(habit);
  return groups;
}

/**
 * Top-level tasks grouped by status, each with its subtasks. A subtask whose
 * parent is gone (deleted in Notion, say) is shown as a top-level task rather
 * than disappearing. `inProject` picks which projects' tasks to include.
 */
export function groupTasks(
  tasks: Task[],
  inProject: (project: string) => boolean = () => true
): Record<TaskStatus, { task: Task; subtasks: Task[] }[]> {
  const ids = new Set(tasks.map((t) => t.id));
  // Only top-level tasks are filtered by project; subtasks follow their parent.
  const isTopLevel = (t: Task) => (!t.parentId || !ids.has(t.parentId)) && inProject(t.project);
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
