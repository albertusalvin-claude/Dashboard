"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { moveActionables } from "../actions/actionables";
import {
  CATEGORY_COLOR,
  GENERAL_PROJECT,
  HABIT_STATUSES,
  STATUS_COLOR,
  TASK_STATUSES,
  formatDate,
  groupHabits,
  groupTasks,
  type Habit,
  type HabitStatus,
  type Projects,
  type Task,
  type TaskStatus,
} from "../lib/actionables";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";
import ActionableDetail, { type Selection } from "./ActionableDetail";
import ProjectBar, { chipCls } from "./ProjectBar";

type Props = {
  /** Null when the Notion database isn't configured. */
  habits: Habit[] | null;
  tasks: Task[] | null;
  /** Empty when tasks aren't configured. */
  projects: Projects;
  /** YYYY-MM-DD, from the server so it renders the same on both sides. */
  today: string;
};

type Move = { id: string; order: number; status?: TaskStatus | HabitStatus };

// The list's share of the width when the panel is open; the divider between
// them can be dragged within these bounds. Remembered per browser.
const SPLIT_KEY = "actionables:split";
const SPLIT_DEFAULT = 0.5;
const SPLIT_MIN = 0.25;
const SPLIT_MAX = 0.75;
const clampSplit = (f: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, f));

function storedSplit(): number {
  try {
    const value = Number(localStorage.getItem(SPLIT_KEY));
    return value ? clampSplit(value) : SPLIT_DEFAULT;
  } catch {
    return SPLIT_DEFAULT;
  }
}

function storeSplit(f: number) {
  try {
    localStorage.setItem(SPLIT_KEY, String(f));
  } catch {
    // Private windows and blocked storage just don't remember it.
  }
}

const addCls =
  "font-mono text-xs px-2 py-1 rounded-full border border-dashed border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer";

function NotConnected({ envVar }: { envVar: string }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-5 text-sm text-ink-soft">
      Not connected yet — add{" "}
      <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">{envVar}</code> to{" "}
      <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">.env.local</code> and Vercel.
    </div>
  );
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="font-display font-bold text-2xl text-ink tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

/**
 * A card's name and its details (category, dates). The name wraps to at most
 * three lines before ending in "…". On a phone the details sit under the name
 * so it keeps the full width; from sm up they sit to its right.
 */
function CardText({ name, nameClass, meta }: { name: string; nameClass: string; meta?: ReactNode }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
      <span className={`flex-1 min-w-0 line-clamp-3 break-words ${nameClass}`}>{name}</span>
      {meta && <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:mt-0.5">{meta}</div>}
    </div>
  );
}

/** Applies moves to a list, so a drag shows before Notion has saved it. */
function applyMoves<T extends { id: string; order: number }>(items: T[], moves: Move[]): T[] {
  const byId = new Map(moves.map((m) => [m.id, m]));
  return items.map((item) => {
    const move = byId.get(item.id);
    return move ? { ...item, order: move.order, ...(move.status ? { status: move.status } : {}) } : item;
  });
}

/** The ids of a list with `id` moved to sit before `beforeId` (or at the end). */
function reordered(ids: string[], id: string, beforeId: string | null): string[] {
  const rest = ids.filter((x) => x !== id);
  const at = beforeId ? rest.indexOf(beforeId) : -1;
  rest.splice(at === -1 ? rest.length : at, 0, id);
  return rest;
}

export default function ActionablesTab({ habits: serverHabits, tasks: serverTasks, projects, today }: Props) {
  const router = useRouter();
  const isDummy = useIsDummyRoute();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  // Null shows every project but the archived ones. One deleted elsewhere
  // falls back to All.
  const [chosenProject, setProject] = useState<string | null>(null);
  const project = chosenProject !== null && projects.all.includes(chosenProject) ? chosenProject : null;
  const isArchived = (p: string) => projects.archived.includes(p);

  // Local copies, so drags show immediately; reset whenever the server sends
  // fresh data.
  const [habits, setHabits] = useState(serverHabits ?? []);
  const [tasks, setTasks] = useState(serverTasks ?? []);
  const [synced, setSynced] = useState({ serverHabits, serverTasks });
  if (synced.serverHabits !== serverHabits || synced.serverTasks !== serverTasks) {
    setSynced({ serverHabits, serverTasks });
    setHabits(serverHabits ?? []);
    setTasks(serverTasks ?? []);
  }

  const [dragging, setDragging] = useState<{ kind: "habit" | "task"; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const layout = useRef<HTMLDivElement>(null);
  // Read lazily: the panel (and so the split) only shows after a click, so
  // the server's default never has to match the browser's stored value.
  const [split, setSplit] = useState(() => (typeof window === "undefined" ? SPLIT_DEFAULT : storedSplit()));
  const [resizing, setResizing] = useState(false);

  function resizeTo(clientX: number) {
    const rect = layout.current?.getBoundingClientRect();
    if (rect) setSplit(clampSplit((clientX - rect.left) / rect.width));
  }

  function nudgeSplit(delta: number) {
    const next = clampSplit(split + delta);
    setSplit(next);
    storeSplit(next);
  }

  const habitGroups = groupHabits(habits);
  // Which group of habits shows; Active to start with.
  const [habitStatus, setHabitStatus] = useState<HabitStatus>("Active");
  const allGroups = groupTasks(tasks);
  const groups = groupTasks(tasks, (p) => (project === null ? !isArchived(p) : p === project));
  const projectCounts: Record<string, number> = {};
  for (const { task } of TASK_STATUSES.flatMap((s) => allGroups[s])) {
    projectCounts[task.project] = (projectCounts[task.project] ?? 0) + 1;
  }
  const nextHabitOrder = habits.reduce((max, h) => Math.max(max, h.order + 1), 0);
  const nextTaskOrder = tasks.reduce((max, t) => Math.max(max, t.order + 1), 0);

  function persist(moves: Move[]) {
    if (moves.length === 0) return;
    setError(null);
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = await moveActionables(moves);
      if (!result.ok) {
        setError(result.error);
        setHabits(serverHabits ?? []);
        setTasks(serverTasks ?? []);
      }
      router.refresh();
    });
  }

  // Like a task: on a group it goes to the end, on a habit just before it.
  function dropHabit(status: HabitStatus, beforeId: string | null) {
    const dragged = dragging;
    endDrag();
    if (dragged?.kind !== "habit") return;
    const moving = habits.find((h) => h.id === dragged.id);
    if (!moving) return;
    const ids = reordered(habitGroups[status].map((h) => h.id), dragged.id, beforeId);
    const moves: Move[] = ids
      .map((id, order) => ({ id, order, status: id === dragged.id && moving.status !== status ? status : undefined }))
      .filter(({ id, order, status: changed }) => changed || habits.find((h) => h.id === id)?.order !== order);
    setHabits((current) => applyMoves(current, moves));
    persist(moves);
  }

  // Dropping a task on a group puts it at the end; on a task, just before it.
  // Its subtasks stay attached and come along.
  function dropTask(status: TaskStatus, beforeId: string | null) {
    const dragged = dragging;
    endDrag();
    if (dragged?.kind !== "task") return;
    const moving = tasks.find((t) => t.id === dragged.id);
    if (!moving) return;
    // Order is shared across projects, so renumber the whole group. Dropped
    // at the end of the list, it goes just after the last task showing.
    const allIds = allGroups[status].map((g) => g.task.id).filter((id) => id !== dragged.id);
    const shown = groups[status].map((g) => g.task.id).filter((id) => id !== dragged.id);
    const before = beforeId ?? (shown.length ? (allIds[allIds.indexOf(shown[shown.length - 1]) + 1] ?? null) : null);
    const ids = reordered(allIds, dragged.id, before);
    const moves: Move[] = ids
      .map((id, order) => ({ id, order, status: id === dragged.id && moving.status !== status ? status : undefined }))
      .filter(({ id, order, status: changed }) => changed || tasks.find((t) => t.id === id)?.order !== order);
    setTasks((current) => applyMoves(current, moves));
    persist(moves);
  }

  function endDrag() {
    setDragging(null);
    setDropTarget(null);
  }

  const isSelected = (kind: "habit" | "task", id: string) => selection?.kind === kind && selection.id === id;

  // A card that can be dragged, and dropped on to sit in front of it.
  function cardProps(kind: "habit" | "task", id: string, onDrop: () => void) {
    const key = `${kind}:${id}`;
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        setDragging({ kind, id });
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
      },
      onDragOver: (e: React.DragEvent) => {
        if (dragging?.kind !== kind) return;
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(key);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      },
      onDragEnd: endDrag,
      onClick: () => setSelection({ kind, id }),
      className: `flex items-start gap-3 bg-card border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
        isSelected(kind, id) ? "border-ink" : "border-line hover:border-ink-soft"
      } ${dragging?.id === id ? "opacity-40" : ""}`,
      // A chili line above the card shows where the dragged one will land.
      style: dropTarget === key ? { boxShadow: "0 -3px 0 #CB3A1E" } : undefined,
    };
  }

  // A list the dragged card can be dropped on, landing at the end.
  function listProps(kind: "habit" | "task", key: string, onDrop: () => void) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (dragging?.kind !== kind) return;
        e.preventDefault();
        setDropTarget(key);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        onDrop();
      },
      className: `space-y-2 min-h-14 rounded-2xl p-1 -m-1 transition-colors ${dropTarget === key ? "bg-[rgba(203,58,30,0.06)]" : ""}`,
    };
  }

  const list = (
    <div className="space-y-10 min-w-0">
      {error && (
        <div
          className="rounded-xl border px-4 py-2.5 text-sm break-words"
          style={{ borderColor: "#CB3A1E", color: "#CB3A1E", background: "rgba(203,58,30,0.08)" }}
        >
          {error}
        </div>
      )}

      <section>
        <SectionTitle
          title="Habits"
          action={
            serverHabits && (
              <button onClick={() => setSelection({ kind: "newHabit", status: habitStatus })} className={addCls}>
                + Add habit
              </button>
            )
          }
        />
        {!serverHabits ? (
          <NotConnected envVar="NOTION_HABITS_ID" />
        ) : (
          <>
            {/* One group at a time. A habit dropped on a chip moves there. */}
            <div className="flex flex-wrap items-center gap-1.5 mb-5">
              {HABIT_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => setHabitStatus(status)}
                  onDragOver={(e) => {
                    if (dragging?.kind !== "habit") return;
                    e.preventDefault();
                    setDropTarget(`chip:${status}`);
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === `chip:${status}` ? null : t))}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropHabit(status, null);
                  }}
                  className={`${chipCls(habitStatus === status)} ${
                    dropTarget === `chip:${status}` ? "!border-[#CB3A1E] !text-[#CB3A1E]" : ""
                  }`}
                >
                  {status} <span className="opacity-60">{habitGroups[status].length}</span>
                </button>
              ))}
            </div>
            <div {...listProps("habit", `habits:${habitStatus}`, () => dropHabit(habitStatus, null))}>
              {habitGroups[habitStatus].length === 0 && (
                <p className="text-sm text-ink-soft italic px-1 py-3">
                  {habitStatus === "Active" ? "No habits yet." : `No ${habitStatus.toLowerCase()} habits.`}
                </p>
              )}
              {habitGroups[habitStatus].map((habit) => {
                const ended = habit.endDate !== null && habit.endDate < today;
                const faded = ended || habitStatus === "Archived";
                return (
                  <div key={habit.id} {...cardProps("habit", habit.id, () => dropHabit(habitStatus, habit.id))}>
                    <span className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ background: CATEGORY_COLOR[habit.category] }} />
                    <CardText
                      name={habit.name}
                      nameClass={faded ? "text-ink-soft" : "text-ink"}
                      meta={
                        <>
                          <span
                            className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{ color: CATEGORY_COLOR[habit.category], background: `${CATEGORY_COLOR[habit.category]}1F` }}
                          >
                            {habit.category}
                          </span>
                          {habit.endDate && (
                            <span className="font-mono text-xs text-ink-soft">
                              {ended ? "ended" : "until"} {formatDate(habit.endDate)}
                            </span>
                          )}
                        </>
                      }
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section>
        <SectionTitle title="Tasks" />
        {!serverTasks ? (
          <NotConnected envVar="NOTION_TASKS_ID" />
        ) : (
          <div className="space-y-6">
            <ProjectBar projects={projects} counts={projectCounts} selected={project} onSelect={setProject} />
            {TASK_STATUSES.map((status) => (
              <div key={status}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="flex items-center gap-2 font-display font-bold text-base text-ink">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLOR[status] }} />
                    {status}
                    <span className="font-mono text-xs font-normal text-ink-soft">{groups[status].length}</span>
                  </h3>
                  <button onClick={() => setSelection({ kind: "newTask", status, parentId: null, project: project ?? GENERAL_PROJECT })} className={addCls}>
                    + Add
                  </button>
                </div>
                <div {...listProps("task", `group:${status}`, () => dropTask(status, null))}>
                  {groups[status].length === 0 && (
                    <p className="text-sm text-ink-soft italic px-1 py-3">Nothing here — drag a task in.</p>
                  )}
                  {groups[status].map(({ task, subtasks }) => {
                    const overdue = task.dueDate !== null && task.dueDate < today && task.status !== "Done";
                    return (
                      <div key={task.id} className="space-y-1.5">
                        <div {...cardProps("task", task.id, () => dropTask(status, task.id))}>
                          <span className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[task.status] }} />
                          <CardText
                            name={task.name}
                            nameClass={task.status === "Done" ? "line-through text-ink-soft" : "text-ink"}
                            meta={
                              (task.dueDate || !project) && (
                                <>
                                  {/* Which project, when they're all showing. */}
                                  {!project && (
                                    <span className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-line text-ink-soft">
                                      {task.project}
                                    </span>
                                  )}
                                  {task.dueDate && (
                                    <span className={`font-mono text-xs ${overdue ? "text-chili font-bold" : "text-ink-soft"}`}>
                                      due {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                </>
                              )
                            }
                          />
                        </div>
                        {subtasks.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => setSelection({ kind: "task", id: sub.id })}
                            className={`ml-8 w-[calc(100%-2rem)] flex items-start gap-2 text-left text-sm bg-card border rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                              isSelected("task", sub.id) ? "border-ink" : "border-line hover:border-ink-soft"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 mt-[7px] rounded-full shrink-0" style={{ background: STATUS_COLOR[sub.status] }} />
                            <span className={`min-w-0 line-clamp-3 break-words ${sub.status === "Done" ? "line-through text-ink-soft" : "text-ink"}`}>
                              {sub.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  // Remount the panel when it switches item, or when a drag changes the open
  // task's status, so its draft starts from what's saved.
  const selectedItem =
    selection?.kind === "task"
      ? tasks.find((t) => t.id === selection.id)
      : selection?.kind === "habit"
        ? habits.find((h) => h.id === selection.id)
        : undefined;
  const panelKey = selection
    ? `${selection.kind}:${"id" in selection ? selection.id : ""}:${selectedItem?.status ?? ""}:${
        selection.kind === "newTask"
          ? `${selection.status}:${selection.parentId}:${selection.project}`
          : selection.kind === "newHabit"
            ? selection.status
            : ""
      }`
    : "";

  return (
    <div
      ref={layout}
      className={`${selection ? "lg:grid" : ""} ${resizing ? "select-none cursor-col-resize" : ""}`}
      // Only takes effect from lg up, where the container is a grid.
      style={selection ? { gridTemplateColumns: `minmax(0, ${split}fr) 2.5rem minmax(0, ${1 - split}fr)` } : undefined}
    >
      {list}
      {selection && (
        // The line between list and panel: drag it, use the arrow keys, or
        // double-click to put it back in the middle.
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          aria-valuemin={SPLIT_MIN * 100}
          aria-valuemax={SPLIT_MAX * 100}
          aria-valuenow={Math.round(split * 100)}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setResizing(true);
          }}
          onPointerMove={(e) => {
            if (resizing) resizeTo(e.clientX);
          }}
          onPointerUp={() => {
            setResizing(false);
            storeSplit(split);
          }}
          onDoubleClick={() => {
            setSplit(SPLIT_DEFAULT);
            storeSplit(SPLIT_DEFAULT);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") nudgeSplit(-0.02);
            if (e.key === "ArrowRight") nudgeSplit(0.02);
          }}
          className="group hidden lg:flex justify-center cursor-col-resize touch-none focus:outline-none"
        >
          <div
            className={`w-0.5 h-full rounded-full transition-all group-hover:w-1 group-hover:bg-ink-soft/30 group-focus-visible:bg-ink-soft/30 ${
              resizing ? "w-1 bg-ink-soft/30" : "bg-line"
            }`}
          />
        </div>
      )}
      {selection && (
        // Full-screen on a phone; the right-hand column from lg up.
        <aside className="fixed inset-0 z-40 overflow-y-auto bg-paper p-4 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0">
          <div className="lg:sticky lg:top-6">
            <ActionableDetail
              key={panelKey}
              selection={selection}
              habits={habits}
              tasks={tasks}
              projects={projects.all.filter((p) => !isArchived(p))}
              nextOrder={selection.kind === "newHabit" ? nextHabitOrder : nextTaskOrder}
              onSelect={setSelection}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
