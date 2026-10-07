"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addProject, deleteProject, renameProject, setProjectArchived } from "../actions/actionables";
import { GENERAL_PROJECT, projectNameError, type Projects } from "../lib/actionables";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";

type Result = { ok: true } | { ok: false; error: string };

type Props = {
  projects: Projects;
  /** Top-level tasks in each project, for the chips' counts. */
  counts: Record<string, number>;
  /** Null shows every project but the archived ones. */
  selected: string | null;
  onSelect: (project: string | null) => void;
};

export const chipCls = (active: boolean, archived = false) =>
  `font-mono text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
    active
      ? "bg-ink text-paper border-ink"
      : `${archived ? "border-dashed opacity-70" : ""} border-line text-ink-soft hover:border-ink-soft hover:text-ink`
  }`;

const smallCls =
  "font-mono text-xs px-2 py-1 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer disabled:opacity-40";

const MENU_WIDTH = 224;

const menuItemCls =
  "w-full text-left font-mono text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40";

const inputCls =
  "rounded-full border border-line bg-paper px-3 py-1 font-mono text-xs text-ink focus:outline-none focus:border-ink-soft";

/**
 * Picks which project's tasks show (or All), and adds, renames, archives and
 * deletes projects. General is the default and can't be changed. Archived
 * projects sit in a collapsed group and are left out of All.
 */
export default function ProjectBar({ projects, counts, selected, onSelect }: Props) {
  const router = useRouter();
  const isDummy = useIsDummyRoute();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // What's being edited: a new project, or renaming the selected one.
  const [editing, setEditing] = useState<"add" | "rename" | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  // The settings menu closes on a click outside it, or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => {
      setMenuOpen(false);
      setConfirmingDelete(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isArchived = (p: string) => projects.archived.includes(p);
  const active = projects.all.filter((p) => !isArchived(p));
  const total = active.reduce((sum, p) => sum + (counts[p] ?? 0), 0);
  const canManage = selected !== null && selected !== GENERAL_PROJECT;
  const selectedArchived = selected !== null && isArchived(selected);

  function select(project: string | null) {
    onSelect(project);
    setMenuOpen(false);
    setEditing(null);
    setConfirmingDelete(false);
    setError(null);
  }

  function run(action: () => Promise<Result>, after: () => void) {
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
      after();
      router.refresh();
    });
  }

  function submit() {
    const name = draft.trim();
    const problem = projectNameError(name, projects.all, editing === "rename" ? (selected ?? undefined) : undefined);
    if (problem) {
      setError(problem);
      return;
    }
    if (editing === "add") {
      run(() => addProject(name), () => select(name));
    } else if (editing === "rename" && selected) {
      if (name === selected) return setEditing(null);
      run(() => renameProject(selected, name), () => select(name));
    }
  }

  function remove() {
    if (!selected) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    run(() => deleteProject(selected), () => select(GENERAL_PROJECT));
  }

  function startEditing(kind: "add" | "rename", name: string) {
    setDraft(name);
    setEditing(kind);
    setMenuOpen(false);
    setConfirmingDelete(false);
    setError(null);
  }

  function toggleArchived() {
    if (!selected) return;
    // Archiving goes back to All, where it no longer shows; unarchiving
    // stays on it.
    run(() => setProjectArchived(selected, !selectedArchived), () => (selectedArchived ? select(selected) : select(null)));
  }

  const nameInput = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="ml-auto flex items-center gap-1.5"
    >
      <input
        autoFocus
        value={draft}
        placeholder="Project name"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
        className={`${inputCls} w-36`}
      />
      <button type="submit" disabled={isPending || !draft.trim()} className={smallCls}>
        {isPending ? "Saving…" : editing === "add" ? "Add" : "Rename"}
      </button>
      <button type="button" onClick={() => setEditing(null)} className={smallCls}>
        Cancel
      </button>
    </form>
  );

  return (
    <div className="space-y-2 mb-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => select(null)} className={chipCls(selected === null)}>
          All <span className="opacity-60">{total}</span>
        </button>
        {active.map((p) => (
          <button key={p} onClick={() => select(p)} className={chipCls(selected === p)}>
            {p} <span className="opacity-60">{counts[p] ?? 0}</span>
          </button>
        ))}
        {editing ? (
          nameInput
        ) : (
          // Pushed to the right end of the row.
          <div ref={menu} className="relative ml-auto">
            <button
              onClick={() => {
                setMenuOpen((v) => !v);
                setConfirmingDelete(false);
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`font-mono text-xs px-2 py-1 rounded-full transition-colors cursor-pointer ${
                menuOpen ? "text-ink bg-card" : "text-ink-soft hover:text-ink hover:bg-card"
              }`}
            >
              Settings
            </button>
            {menuOpen && (
              <div
                role="menu"
                style={{ width: MENU_WIDTH }}
                className={`absolute right-0 top-full mt-1 z-20 bg-card border border-line rounded-xl p-1 shadow-lg`}
              >
                <button
                  role="menuitem"
                  onClick={() => startEditing("add", "")}
                  className={`${menuItemCls} text-ink hover:bg-paper`}
                >
                  + Add project
                </button>
                {canManage && (
                  <>
                    <div className="my-1 border-t border-line" />
                    <p className="px-3 pt-1 pb-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                      Selected project
                    </p>
                    <button
                      role="menuitem"
                      onClick={() => startEditing("rename", selected)}
                      className={`${menuItemCls} text-ink hover:bg-paper`}
                    >
                      Rename
                    </button>
                    <button
                      role="menuitem"
                      onClick={toggleArchived}
                      disabled={isPending}
                      className={`${menuItemCls} text-ink hover:bg-paper`}
                    >
                      {selectedArchived ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      role="menuitem"
                      onClick={remove}
                      disabled={isPending}
                      className={`${menuItemCls} text-[#CB3A1E] ${
                        confirmingDelete ? "bg-[rgba(203,58,30,0.08)]" : "hover:bg-[rgba(203,58,30,0.08)]"
                      }`}
                    >
                      {isPending
                        ? "Working…"
                        : confirmingDelete
                          ? counts[selected]
                            ? `Tap again — its tasks move to ${GENERAL_PROJECT}`
                            : "Tap again to delete"
                          : "Delete project"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {projects.archived.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived || selectedArchived}
            className="font-mono text-xs px-1 py-1 text-ink-soft hover:text-ink cursor-pointer"
          >
            {showArchived || selectedArchived ? "▾" : "▸"} Archived {projects.archived.length}
          </button>
          {(showArchived || selectedArchived) &&
            projects.archived.map((p) => (
              <button key={p} onClick={() => select(p)} className={chipCls(selected === p, true)}>
                {p} <span className="opacity-60">{counts[p] ?? 0}</span>
              </button>
            ))}
        </div>
      )}

      {error && <p className="text-xs break-words" style={{ color: "#CB3A1E" }}>{error}</p>}
    </div>
  );
}
