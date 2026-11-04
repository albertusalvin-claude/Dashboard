import { describe, expect, it } from "vitest";
import type { Task } from "./actionables";
import { bringBackRecurring, formatRepeat, nextOccurrence, parseRepeat, returnsOn, type Repeat } from "./recurrence";

// Midday in Melbourne on that day, so the finished-on day is unambiguous.
const editedOn = (day: string) => `${day}T02:00:00.000Z`;

const task = (extra: Partial<Task>): Task => ({
  id: "t",
  name: "Water plants",
  order: 0,
  status: "Done",
  project: "General",
  dueDate: null,
  description: "",
  parentId: null,
  repeat: null,
  completedOn: null,
  createdTime: editedOn("2026-01-01"),
  lastEditedTime: editedOn("2026-01-01"),
  ...extra,
});

// 2026-11-02 is a Monday.
const mondays: Repeat = { kind: "weekdays", days: [1] };

describe("parseRepeat and formatRepeat", () => {
  const cases: [string, Repeat][] = [
    ["Every Mon", { kind: "weekdays", days: [1] }],
    ["Every Mon, Wed, Fri", { kind: "weekdays", days: [1, 3, 5] }],
    ["Monthly on the 1st", { kind: "monthDay", day: 1 }],
    ["Monthly on the 22nd", { kind: "monthDay", day: 22 }],
    ["Monthly on the 13th", { kind: "monthDay", day: 13 }],
  ];

  it.each(cases)("reads and writes %s", (text, repeat) => {
    expect(parseRepeat(text)).toEqual(repeat);
    expect(formatRepeat(repeat)).toBe(text);
  });

  it("takes text typed loosely in Notion", () => {
    expect(parseRepeat("  every friday monday ")).toEqual({ kind: "weekdays", days: [1, 5] });
    expect(parseRepeat("MONTHLY ON THE 5")).toEqual({ kind: "monthDay", day: 5 });
  });

  it("treats blank or unreadable text as not repeating", () => {
    expect(parseRepeat("")).toBeNull();
    expect(parseRepeat("sometimes")).toBeNull();
    expect(parseRepeat("Every week")).toBeNull();
    expect(parseRepeat("Every ,")).toBeNull();
    expect(parseRepeat("Monthly on the 32nd")).toBeNull();
  });
});

describe("nextOccurrence", () => {
  it("finds the next chosen weekday", () => {
    // 2026-11-04 is a Wednesday.
    expect(nextOccurrence({ kind: "weekdays", days: [1, 3, 5] }, "2026-11-04")).toBe("2026-11-06");
    expect(nextOccurrence(mondays, "2026-11-04")).toBe("2026-11-09");
  });

  it("finds the next day of the month, short months using their last day", () => {
    expect(nextOccurrence({ kind: "monthDay", day: 15 }, "2026-11-04")).toBe("2026-11-15");
    expect(nextOccurrence({ kind: "monthDay", day: 15 }, "2026-11-15")).toBe("2026-12-15");
    expect(nextOccurrence({ kind: "monthDay", day: 31 }, "2027-02-01")).toBe("2027-02-28");
  });

  it("rolls over from December into January of the next year", () => {
    expect(nextOccurrence({ kind: "monthDay", day: 10 }, "2026-12-20")).toBe("2027-01-10");
    expect(nextOccurrence({ kind: "monthDay", day: 31 }, "2026-12-31")).toBe("2027-01-31");
  });
});

describe("returnsOn", () => {
  it("stays Done until the next date comes", () => {
    const done = task({ repeat: mondays, dueDate: "2026-11-02", completedOn: "2026-11-02" });
    expect(returnsOn(done, "2026-11-08")).toBeNull();
    expect(returnsOn(done, "2026-11-09")).toBe("2026-11-09");
  });

  it("doesn't come back the same round when finished early", () => {
    const early = task({ repeat: mondays, dueDate: "2026-11-09", completedOn: "2026-11-06" });
    expect(returnsOn(early, "2026-11-09")).toBeNull();
    expect(returnsOn(early, "2026-11-16")).toBe("2026-11-16");
  });

  it("doesn't come back straight away when finished late", () => {
    const late = task({ repeat: mondays, dueDate: "2026-11-02", completedOn: "2026-11-12" });
    expect(returnsOn(late, "2026-11-12")).toBeNull();
    expect(returnsOn(late, "2026-11-16")).toBe("2026-11-16");
  });

  it("comes back due the latest date that's passed after a long gap", () => {
    const old = task({ repeat: mondays, dueDate: "2026-10-05", completedOn: "2026-10-05" });
    expect(returnsOn(old, "2026-11-04")).toBe("2026-11-02");
  });

  it("counts from the day it was finished when it has no due date", () => {
    const undated = task({ repeat: { kind: "monthDay", day: 3 }, completedOn: "2026-10-20" });
    expect(returnsOn(undated, "2026-11-04")).toBe("2026-11-03");
  });

  it("counts from Completed, not a later edit", () => {
    const edited = task({ repeat: mondays, completedOn: "2026-11-03", lastEditedTime: editedOn("2026-11-10") });
    expect(returnsOn(edited, "2026-11-09")).toBe("2026-11-09");
  });

  it("falls back to the last edit when Completed wasn't recorded", () => {
    const fromNotion = task({ repeat: mondays, lastEditedTime: editedOn("2026-11-03") });
    expect(returnsOn(fromNotion, "2026-11-08")).toBeNull();
    expect(returnsOn(fromNotion, "2026-11-09")).toBe("2026-11-09");
  });

  it("leaves tasks that aren't Done or don't repeat", () => {
    expect(returnsOn(task({ repeat: mondays, status: "Todo" }), "2027-01-01")).toBeNull();
    expect(returnsOn(task({}), "2027-01-01")).toBeNull();
  });
});

describe("bringBackRecurring", () => {
  it("moves a due task and its subtasks to Todo", () => {
    const parent = task({ id: "p", repeat: mondays, completedOn: "2026-10-30" });
    const doneSub = task({ id: "a", parentId: "p", dueDate: "2026-10-01" });
    const todoSub = task({ id: "b", parentId: "p", status: "Todo" });
    const other = task({ id: "o" });

    const { tasks, changes } = bringBackRecurring([parent, doneSub, todoSub, other], "2026-11-04");
    expect(changes).toEqual([
      { id: "p", dueDate: "2026-11-02" },
      { id: "a", dueDate: null },
    ]);
    expect(tasks.map((t) => [t.id, t.status, t.dueDate])).toEqual([
      ["p", "Todo", "2026-11-02"],
      ["a", "Todo", "2026-10-01"],
      ["b", "Todo", null],
      ["o", "Done", null],
    ]);
  });
});
