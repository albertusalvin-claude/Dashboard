import type { Task } from "./actionables";

// Recurring tasks: a Done task with a Repeat moves back to Todo once its next
// scheduled date comes, with that date as its due date. Pure, so the page and
// the tests share it. Dates are YYYY-MM-DD.

/** Index 0 is Sunday, matching Date#getUTCDay. */
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type Repeat =
  /** At least one day, so there's always a next one. */
  | { kind: "weekdays"; days: [number, ...number[]] }
  /** 1–31; a month without that day uses its last day. */
  | { kind: "monthDay"; day: number };

const ordinal = (n: number) => {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
};

// Stored in Notion as text a person can read and type: "Every Mon, Wed, Fri",
// "Monthly on the 15th".
export function formatRepeat(repeat: Repeat): string {
  return repeat.kind === "weekdays"
    ? `Every ${[...repeat.days].sort().map((d) => WEEKDAYS[d]).join(", ")}`
    : `Monthly on the ${ordinal(repeat.day)}`;
}

/** Null for blank or unreadable text, which means the task doesn't repeat. */
export function parseRepeat(text: string): Repeat | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");

  const monthly = t.match(/^monthly on the (\d{1,2})(?:st|nd|rd|th)?$/);
  if (monthly) {
    const day = Number(monthly[1]);
    return day >= 1 && day <= 31 ? { kind: "monthDay", day } : null;
  }

  const weekdays = t.match(/^every (.+)$/);
  if (weekdays) {
    const days = weekdays[1].split(/[\s,]+/).filter(Boolean).map((name) => WEEKDAYS.findIndex((w) => w.toLowerCase() === name.slice(0, 3)));
    const [first, ...rest] = [...new Set(days)].sort();
    if (first !== undefined && !days.includes(-1)) return { kind: "weekdays", days: [first, ...rest] };
  }
  return null;
}

const DAY_MS = 86_400_000;
const toMs = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Months below are 1 = January … 12 = December. Date.UTC counts them from 0,
// so it's given `month - 1`; a month past 12 rolls into the next year.

/** How many days the month has: 30 for April, 28 or 29 for February. */
function daysInMonth(year: number, month: number): number {
  // Day 0 of the following month is this month's last day. That month is
  // index `month` to Date.UTC, since it counts from 0.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "YYYY-MM-DD" for `day` in that month, or the month's last day if it's shorter. */
function dateInMonthOrLastDay(year: number, month: number, day: number): string {
  return fromMs(Date.UTC(year, month - 1, Math.min(day, daysInMonth(year, month))));
}

/** The first scheduled date after `after`. */
export function nextOccurrence(repeat: Repeat, after: string): string {
  if (repeat.kind === "weekdays") {
    // Days until each chosen weekday, 1–7 (the same weekday is a week on).
    const weekday = new Date(toMs(after)).getUTCDay();
    const gap = Math.min(...repeat.days.map((d) => ((d - weekday + 6) % 7) + 1));
    return fromMs(toMs(after) + gap * DAY_MS);
  }
  // "2026-11-04" → year 2026, month 11.
  const [year, month] = [+after.slice(0, 4), +after.slice(5, 7)];
  // This month's date if it's still ahead, otherwise next month's.
  const thisMonth = dateInMonthOrLastDay(year, month, repeat.day);
  return thisMonth > after ? thisMonth : dateInMonthOrLastDay(year, month + 1, repeat.day);
}

/** The dashboard owner's calendar day for a moment, not the server's (UTC on Vercel). */
export const melbourneDay = (moment: string | Date = new Date()) =>
  new Date(moment).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

/**
 * The due date a Done recurring task comes back to Todo with, once that day
 * has come; null while it stays Done. It counts on from its due date or the
 * day it was finished, whichever is later, so a task finished early isn't due
 * again the same round, and one finished late isn't due again straight away.
 */
export function returnsOn(
  task: Pick<Task, "status" | "repeat" | "dueDate" | "completedOn" | "lastEditedTime">,
  today: string
): string | null {
  if (task.status !== "Done" || !task.repeat) return null;
  // Its last edit stands in for one marked Done in Notion, or before the
  // dashboard recorded Completed.
  const doneOn = task.completedOn ?? melbourneDay(task.lastEditedTime);
  let on = nextOccurrence(task.repeat, task.dueDate && task.dueDate > doneOn ? task.dueDate : doneOn);
  if (on > today) return null;
  // Not opened for a while: loop until it reach the last occurence before today.
  for (let later = nextOccurrence(task.repeat, on); later <= today; later = nextOccurrence(task.repeat, later)) on = later;
  return on;
}

/**
 * The tasks with the recurring ones that are due again back in Todo, and
 * their subtasks with them, plus what changed, to save to Notion. A subtask's
 * due date is left as it is.
 */
export function bringBackRecurring(tasks: Task[], today: string): { tasks: Task[]; changes: { id: string; dueDate: string | null }[] } {
  const back = new Map<string, string | null>();
  for (const task of tasks) {
    const on = returnsOn(task, today);
    if (on) back.set(task.id, on);
  }
  for (const task of tasks) {
    if (task.parentId && back.has(task.parentId) && task.status !== "Todo" && !back.has(task.id)) back.set(task.id, null);
  }
  return {
    tasks: tasks.map((t) =>
      back.has(t.id) ? { ...t, status: "Todo", dueDate: back.get(t.id) ?? t.dueDate, completedOn: null } : t
    ),
    changes: [...back].map(([id, dueDate]) => ({ id, dueDate })),
  };
}
