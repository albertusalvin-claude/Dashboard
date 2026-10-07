"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHabit, addTask, deleteActionables, updateHabit, updateTask } from "../actions/actionables";
import {
  CATEGORY_COLOR,
  GENERAL_PROJECT,
  HABIT_CATEGORIES,
  HABIT_STATUSES,
  HABIT_STATUS_COLOR,
  STATUS_COLOR,
  TASK_STATUSES,
  formatTimestamp,
  type Habit,
  type HabitCategory,
  type HabitDraft,
  type HabitStatus,
  type Task,
  type TaskDraft,
  type TaskStatus,
} from "../lib/actionables";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";

export type Selection =
  | { kind: "habit"; id: string }
  | { kind: "task"; id: string }
  | { kind: "newHabit"; status: HabitStatus }
  | { kind: "newTask"; status: TaskStatus; parentId: string | null; project: string };

type Result = { ok: true; id?: string } | { ok: false; error: string };

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink focus:outline-none focus:border-ink-soft";

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-line last:border-0">
      <span className="text-xs font-mono uppercase tracking-wide text-ink-soft shrink-0">{label}</span>
      <span className="text-sm text-ink text-right min-w-0">{children}</span>
    </div>
  );
}

type Props = {
  selection: Selection;
  habits: Habit[];
  tasks: Task[];
  /** The projects a task can be filed in — not the archived ones. */
  projects: string[];
  /** Order a newly added habit or task gets — after everything else. */
  nextOrder: number;
  onSelect: (selection: Selection | null) => void;
};

/**
 * The right-hand panel: one habit or task, every field editable — title, the
 * metadata box (created / last edited from Notion, plus the date and status),
 * the description, and for a task its subtasks.
 */
export default function ActionableDetail({ selection, habits, tasks, projects, nextOrder, onSelect }: Props) {
  const router = useRouter();
  const isDummy = useIsDummyRoute();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isHabit = selection.kind === "habit" || selection.kind === "newHabit";
  const habit = selection.kind === "habit" ? habits.find((h) => h.id === selection.id) : undefined;
  const task = selection.kind === "task" ? tasks.find((t) => t.id === selection.id) : undefined;
  const subtasks = task ? tasks.filter((t) => t.parentId === task.id).sort((a, b) => a.order - b.order) : [];
  const parentId = task?.parentId ?? (selection.kind === "newTask" ? selection.parentId : null);
  const parent = parentId ? tasks.find((t) => t.id === parentId) : undefined;
  const existing = habit ?? task;

  const [habitDraft, setHabitDraft] = useState<HabitDraft>(
    habit ?? {
      name: "",
      order: nextOrder,
      status: selection.kind === "newHabit" ? selection.status : "Active",
      category: "Other",
      endDate: null,
      description: "",
    }
  );
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(
    task ?? {
      name: "",
      order: nextOrder,
      status: selection.kind === "newTask" ? selection.status : "Todo",
      // A subtask is filed with its parent.
      project: parent?.project ?? (selection.kind === "newTask" ? selection.project : GENERAL_PROJECT),
      dueDate: null,
      description: "",
      parentId,
    }
  );
  const name = isHabit ? habitDraft.name : taskDraft.name;
  const description = isHabit ? habitDraft.description : taskDraft.description;

  function setName(value: string) {
    if (isHabit) setHabitDraft((d) => ({ ...d, name: value }));
    else setTaskDraft((d) => ({ ...d, name: value }));
    setSaved(false);
  }
  function setDescription(value: string) {
    if (isHabit) setHabitDraft((d) => ({ ...d, description: value }));
    else setTaskDraft((d) => ({ ...d, description: value }));
    setSaved(false);
  }
  function setTask<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setTaskDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  function run(action: () => Promise<Result>, after: (result: { ok: true; id?: string }) => void) {
    setError(null);
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      after(result);
      router.refresh();
    });
  }

  function save() {
    // Order comes from the item as it stands, not the draft, so a drag made
    // while the panel was open isn't undone by saving.
    if (habit) run(() => updateHabit(habit.id, { ...habitDraft, order: habit.order }), () => setSaved(true));
    else if (task)
      run(
        () =>
          updateTask(
            task.id,
            { ...taskDraft, order: task.order },
            // Its subtasks follow it to a new project.
            taskDraft.project !== task.project ? subtasks.map((s) => s.id) : []
          ),
        () => setSaved(true)
      );
    else if (isHabit) run(() => addHabit(habitDraft), (r) => r.id && onSelect({ kind: "habit", id: r.id }));
    else run(() => addTask(taskDraft), (r) => r.id && onSelect({ kind: "task", id: r.id }));
  }

  function remove() {
    if (!existing) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    // A task goes with its subtasks — left behind, they'd surface as orphans.
    run(() => deleteActionables([existing.id, ...subtasks.map((s) => s.id)]), () =>
      onSelect(parent ? { kind: "task", id: parent.id } : null)
    );
  }

  // The item was deleted elsewhere (or in Notion) since it was opened.
  if ((selection.kind === "habit" && !habit) || (selection.kind === "task" && !task)) {
    return (
      <div className="space-y-3">
        <button onClick={() => onSelect(null)} className="font-mono text-ink-soft hover:text-ink cursor-pointer" aria-label="Close panel">
          »
        </button>
        <p className="text-sm text-ink-soft">This item no longer exists.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onSelect(null)}
          aria-label="Close panel"
          className="font-mono text-xl leading-9 text-ink-soft hover:text-ink cursor-pointer shrink-0"
        >
          »
        </button>
        <input
          value={name}
          autoFocus={!existing}
          placeholder={isHabit ? "New habit" : parent ? "New subtask" : "New task"}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent border-b-2 border-ink pb-1 font-display font-bold text-2xl text-ink placeholder:text-ink-soft/50 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs break-words" style={{ color: "#CB3A1E" }}>{error}</p>}

      <div className="bg-card border border-line rounded-2xl px-4 py-2">
        <p className="font-display font-bold text-sm text-ink py-1.5">Metadata</p>
        {parent && (
          <MetaRow label="Subtask of">
            <button onClick={() => onSelect({ kind: "task", id: parent.id })} className="underline cursor-pointer hover:text-chili">
              {parent.name}
            </button>
          </MetaRow>
        )}
        <MetaRow label="Created">{existing ? formatTimestamp(existing.createdTime) : "—"}</MetaRow>
        <MetaRow label="Last edited">{existing ? formatTimestamp(existing.lastEditedTime) : "—"}</MetaRow>
        {isHabit ? (
          <>
            <MetaRow label="Status">
              <select
                value={habitDraft.status}
                onChange={(e) => {
                  setHabitDraft((d) => ({ ...d, status: e.target.value as HabitStatus }));
                  setSaved(false);
                }}
                className={`${inputCls} w-auto`}
                style={{ borderLeft: `4px solid ${HABIT_STATUS_COLOR[habitDraft.status]}` }}
              >
                {HABIT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </MetaRow>
            <MetaRow label="Category">
              <select
                value={habitDraft.category}
                onChange={(e) => {
                  setHabitDraft((d) => ({ ...d, category: e.target.value as HabitCategory }));
                  setSaved(false);
                }}
                className={`${inputCls} w-auto`}
                style={{ borderLeft: `4px solid ${CATEGORY_COLOR[habitDraft.category]}` }}
              >
                {HABIT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </MetaRow>
            <MetaRow label="End date">
              <input
                type="date"
                value={habitDraft.endDate ?? ""}
                onChange={(e) => {
                  setHabitDraft((d) => ({ ...d, endDate: e.target.value || null }));
                  setSaved(false);
                }}
                className={`${inputCls} w-auto`}
              />
            </MetaRow>
          </>
        ) : (
          <>
            <MetaRow label="Due date">
              <input
                type="date"
                value={taskDraft.dueDate ?? ""}
                onChange={(e) => setTask("dueDate", e.target.value || null)}
                className={`${inputCls} w-auto`}
              />
            </MetaRow>
            <MetaRow label="Project">
              {parent ? (
                parent.project
              ) : (
                <select
                  value={taskDraft.project}
                  onChange={(e) => setTask("project", e.target.value)}
                  className={`${inputCls} w-auto`}
                >
                  {/* Keeps a project that was deleted since the panel opened. */}
                  {(projects.includes(taskDraft.project) ? projects : [...projects, taskDraft.project]).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </MetaRow>
            <MetaRow label="Status">
              <select
                value={taskDraft.status}
                onChange={(e) => setTask("status", e.target.value as TaskStatus)}
                className={`${inputCls} w-auto`}
                style={{ borderLeft: `4px solid ${STATUS_COLOR[taskDraft.status]}` }}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </MetaRow>
          </>
        )}
      </div>

      <div className="space-y-2">
        <span className="inline-block font-display font-bold text-sm text-ink border border-ink rounded-md px-2 py-0.5">
          Description
        </span>
        <textarea
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes, links, next steps…"
          className={`${inputCls} leading-relaxed`}
        />
      </div>

      {task && !task.parentId && (
        <div className="space-y-2">
          <p className="font-display font-bold text-sm text-ink">Subtasks</p>
          {subtasks.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect({ kind: "task", id: s.id })}
              className="w-full flex items-start gap-2 text-left text-sm bg-card border border-line rounded-xl px-3 py-2 hover:border-ink-soft cursor-pointer"
            >
              <span className="w-2 h-2 mt-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
              <span className={`min-w-0 line-clamp-3 break-words ${s.status === "Done" ? "line-through text-ink-soft" : "text-ink"}`}>
                {s.name}
              </span>
            </button>
          ))}
          <button
            onClick={() => onSelect({ kind: "newTask", status: "Todo", parentId: task.id, project: task.project })}
            className="font-mono text-xs px-2 py-1 rounded-full border border-dashed border-line text-ink-soft hover:border-ink-soft hover:text-ink cursor-pointer"
          >
            + Add subtask
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={save}
          disabled={isPending || !name.trim()}
          className="font-mono text-xs px-3 py-1.5 rounded-full bg-ink text-paper cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : existing ? "Save" : "Add"}
        </button>
        {saved && <span className="font-mono text-xs text-kale">Saved</span>}
        {existing && (
          <button
            onClick={remove}
            disabled={isPending}
            className={`ml-auto font-mono text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-40 ${
              confirmingDelete
                ? "border-[#CB3A1E] text-[#CB3A1E] bg-[rgba(203,58,30,0.08)]"
                : "border-line text-ink-soft hover:border-[#CB3A1E] hover:text-[#CB3A1E]"
            }`}
          >
            {confirmingDelete ? (subtasks.length ? "Tap again — deletes subtasks too" : "Tap again to delete") : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
