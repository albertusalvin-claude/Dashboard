import type { SpendingEntry } from "../api/spending/route";

// Spending projects are their own list (a trip, a renovation), separate from
// the Actionables tab's task projects. An entry can be in one or none.

/** Where entries that aren't in a project go: the chip and pie slice. */
export const GENERAL = "General";

/** Blank, or typed as General in any case: either way, not in a project. */
export const isGeneral = (project: string) => {
  const name = project.trim().toLowerCase();
  return name === "" || name === GENERAL.toLowerCase();
};

/** An entry's project, with General for the ones that aren't in one. */
export const projectOf = (entry: SpendingEntry) => (isGeneral(entry.project) ? GENERAL : entry.project.trim());

/**
 * The projects to offer, General aside: the Project column's options in
 * Notion's order (so one with no entries yet still shows), then any projects in any entry that isn't one of them
 */
export function spendingProjects(options: string[], entries: SpendingEntry[]): string[] {
  const names = [...options, ...entries.map((e) => e.project)].map((n) => n.trim()).filter((n) => !isGeneral(n));
  return [...new Set(names)];
}

/** Whether an entry belongs under a project chip; null is All. */
export function inProject(entry: SpendingEntry, project: string | null): boolean {
  return project === null || projectOf(entry) === project;
}

/** Why a typed project can't be saved, or null if it can. */
export function spendingProjectError(project: string): string | null {
  // Notion's select options can't contain commas.
  return project.includes(",") ? "Project names can't contain commas." : null;
}
