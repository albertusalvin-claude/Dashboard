import { describe, expect, it } from "vitest";
import {
  formatDate,
  groupHabits,
  groupTasks,
  habitCategoryFrom,
  habitStatusFrom,
  projectList,
  projectNameError,
  taskProjectFrom,
  taskStatusFrom,
  type Habit,
  type Task,
} from "./actionables";

const task = (id: string, status: Task["status"], order: number, parentId: string | null = null): Task => ({
  id,
  name: id,
  order,
  status,
  project: "General",
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

describe("projects", () => {
  it("filters top-level tasks by project, keeping subtasks with their parent", () => {
    const tasks = [
      { ...task("p", "Todo", 0), project: "Travel" },
      task("s", "Todo", 0, "p"),
      task("other", "Todo", 1),
    ];
    const groups = groupTasks(tasks, (p) => p === "Travel");
    expect(groups.Todo.map((g) => g.task.id)).toEqual(["p"]);
    expect(groups.Todo[0].subtasks.map((s) => s.id)).toEqual(["s"]);
    expect(groupTasks(tasks).Todo.map((g) => g.task.id)).toEqual(["p", "other"]);
  });

  it("lists General first, once, then the rest without duplicates", () => {
    expect(projectList(["Travel", "general", "Home", "Travel", " "])).toEqual(["General", "Travel", "Home"]);
    expect(taskProjectFrom(undefined)).toBe("General");
  });

  it("rejects empty, comma-containing and taken names, but allows keeping your own", () => {
    const projects = ["General", "Travel"];
    expect(projectNameError(" ", projects)).not.toBeNull();
    expect(projectNameError("a, b", projects)).not.toBeNull();
    expect(projectNameError("travel", projects)).not.toBeNull();
    expect(projectNameError("TRAVEL", projects, "Travel")).toBeNull();
    expect(projectNameError("Home", projects)).toBeNull();
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

describe("habit statuses", () => {
  const habit = (id: string, status: Habit["status"], order: number): Habit => ({
    id,
    name: id,
    order,
    status,
    category: "Other",
    endDate: null,
    description: "",
    createdTime: "",
    lastEditedTime: "",
  });

  it("reads the Status select case-insensitively, with no status as Active", () => {
    expect(habitStatusFrom("backlog")).toBe("Backlog");
    expect(habitStatusFrom(undefined)).toBe("Active");
    expect(habitStatusFrom("Paused")).toBe("Active");
  });

  it("groups habits by status, each in order", () => {
    const groups = groupHabits([habit("b", "Active", 1), habit("x", "Archived", 0), habit("a", "Active", 0)]);
    expect(groups.Active.map((h) => h.id)).toEqual(["a", "b"]);
    expect(groups.Backlog).toEqual([]);
    expect(groups.Archived.map((h) => h.id)).toEqual(["x"]);
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
