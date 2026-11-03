// What a backup run needs, read from the environment and command line.

import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_OUT = path.join(homedir(), "OneDrive", "Backups", "Notion");

/**
 * The databases to back up: every NOTION_<NAME>_ID in the environment, so a
 * database added to the dashboard later is backed up without editing this.
 * NOTION_MONEY_PROJECTION_ASSUMPTIONS_ID → "moneyProjectionAssumptions".
 */
export function databasesFromEnv(env) {
  return Object.entries(env)
    .filter(([key, value]) => /^NOTION_[A-Z0-9_]+_ID$/.test(key) && value)
    .map(([key, id]) => ({ envVar: key, name: camelCase(key.slice("NOTION_".length, -"_ID".length)), id: id.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function camelCase(snake) {
  return snake
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join("");
}

/**
 * The key, where backups go (--out, else NOTION_BACKUP_DIR, else
 * OneDrive\Backups\Notion) and what to back up: the NOTION_*_ID databases,
 * or with --everything, all the integration can see. Throws if there's
 * nothing to run with.
 */
export function readConfig(env, argv) {
  if (!env.NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY isn't set. Run with: node --env-file=.env.local scripts/backup/backup-notion.mjs");
  }
  const out = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : (env.NOTION_BACKUP_DIR ?? undefined);

  if (argv.includes("--everything")) {
    // A day's backup replaces that day's folder, so two accounts sharing the
    // default would overwrite each other.
    if (!out) throw new Error("--everything needs its own folder: pass --out or set NOTION_BACKUP_DIR.");
    return { mode: "everything", apiKey: env.NOTION_API_KEY, outRoot: path.resolve(out), databases: [] };
  }

  const databases = databasesFromEnv(env);
  if (databases.length === 0) throw new Error("No NOTION_*_ID variables found — nothing to back up. (For a whole account, use --everything.)");
  return { mode: "databases", apiKey: env.NOTION_API_KEY, outRoot: path.resolve(out ?? DEFAULT_OUT), databases };
}
