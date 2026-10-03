import { describe, expect, it } from "vitest";
import { formatDate, groupTasks, habitCategoryFrom, taskStatusFrom, type Task } from "./actionables";

const task = (id: string, status: Task["status"], order: number, parentId: string | null = null): Task => ({
  id,
  name: id,
  order,
  status,
  dueDate: null,
  description: "",
  parentId,
  createdTime: "",
  lastEditedTime: "",
});

describe("groupTasks", () => {
  it("groups top-level tasks by status, in order, with their subtasks", () => {
    const groups = groupTasks([
      task("b", "Todo", 1),
      task("a", "Todo", 0),
      task("sub-2", "Done", 1, "a"),
      task("sub-1", "Todo", 0, "a"),
      task("c", "Doing", 0),
    ]);
    expect(groups.Todo.map((g) => g.task.id)).toEqual(["a", "b"]);
    expect(groups.Todo[0].subtasks.map((s) => s.id)).toEqual(["sub-1", "sub-2"]);
    expect(groups.Doing.map((g) => g.task.id)).toEqual(["c"]);
    expect(groups.Done).toEqual([]);
  });

  // A subtask stays under its parent whatever its own status is.
  it("keeps a subtask with its parent rather than in its own status group", () => {
    const groups = groupTasks([task("p", "Todo", 0), task("s", "Done", 0, "p")]);
    expect(groups.Done).toEqual([]);
    expect(groups.Todo[0].subtasks.map((s) => s.id)).toEqual(["s"]);
  });

  it("shows a subtask whose parent is gone as a top-level task", () => {
    const groups = groupTasks([task("orphan", "Doing", 0, "deleted-parent")]);
    expect(groups.Doing.map((g) => g.task.id)).toEqual(["orphan"]);
  });
});

describe("actionables formatting", () => {
  it("formats a calendar date without shifting it across timezones", () => {
    expect(formatDate("2026-12-31")).toBe("31 Dec 2026");
    expect(formatDate(null)).toBe("");
  });

  it("reads a Status select case-insensitively, defaulting to Todo", () => {
    expect(taskStatusFrom("doing")).toBe("Doing");
    expect(taskStatusFrom(undefined)).toBe("Todo");
  });
});

describe("habit categories", () => {
  it("reads the Category select case-insensitively, with anything unknown as Other", () => {
    expect(habitCategoryFrom("money")).toBe("Money");
    expect(habitCategoryFrom("Relationship")).toBe("Relationship");
    expect(habitCategoryFrom("Hobbies")).toBe("Other");
    expect(habitCategoryFrom(undefined)).toBe("Other");
  });
});
