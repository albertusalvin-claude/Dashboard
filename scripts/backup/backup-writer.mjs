// Writes a day's backup into <date>.incomplete and only renames it to <date>
// on commit, once every file is in — so a run that dies halfway never leaves
// something that looks like a complete backup. Running twice in a day
// replaces that day's, but only with the same kind of backup.

import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** YYYY-MM-DD in Melbourne, so a late-night run is filed under the right day. */
export function todayInMelbourne(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
}

/**
 * Starts a backup in an empty <date>.incomplete folder in outRoot. `kind`
 * ("databases" or "everything") is recorded in manifest.json, and a day's
 * backup of one kind is never replaced by the other — two kinds sharing a
 * folder means two setups pointed at the same place by mistake.
 */
export async function createBackupWriter(outRoot, { kind, date = todayInMelbourne() }) {
  const finalDir = path.join(outRoot, date);
  const existingKind = kindOf(finalDir);
  if (existingKind && existingKind !== kind) {
    throw new Error(`${finalDir} already holds a "${existingKind}" backup; not replacing it with "${kind}". Use a different --out.`);
  }

  const workDir = `${finalDir}.incomplete`;
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  // `fileName` may include a subfolder ("pages/Notes-1a2b3c4d.json").
  async function write(fileName, content) {
    const target = path.join(workDir, fileName);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  return {
    /** Where the backup will be once committed. */
    finalDir,
    writeFile: write,
    writeJson: (fileName, value) => write(fileName, JSON.stringify(value, null, 2)),
    /**
     * Writes manifest.json (when it ran, its kind, each item's result) and
     * renames the folder to <date>, replacing any earlier one from the same day.
     */
    async commit(results) {
      await write("manifest.json", JSON.stringify({ takenAt: new Date().toISOString(), kind, results }, null, 2));
      await rm(finalDir, { recursive: true, force: true });
      await rename(workDir, finalDir);
    },
  };
}

// The kind of backup already in `dir`, if any. Backups from before kinds
// were recorded are all database backups.
function kindOf(dir) {
  const manifest = path.join(dir, "manifest.json");
  if (!existsSync(manifest)) return existsSync(dir) ? "databases" : null;
  try {
    return JSON.parse(readFileSync(manifest, "utf8")).kind ?? "databases";
  } catch {
    return "databases";
  }
}
