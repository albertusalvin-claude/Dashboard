// Writes a day's backup into <date>.incomplete and only renames it to <date>
// on commit, once every file is in — so a run that dies halfway never leaves
// something that looks like a complete backup. Running twice in a day
// replaces that day's.

import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** YYYY-MM-DD in Melbourne, so a late-night run is filed under the right day. */
export function todayInMelbourne(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
}

/** Starts a backup in an empty <date>.incomplete folder in outRoot. */
export async function createBackupWriter(outRoot, date = todayInMelbourne()) {
  const finalDir = path.join(outRoot, date);
  const workDir = `${finalDir}.incomplete`;
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  return {
    /** Where the backup will be once committed. */
    finalDir,
    writeFile: (fileName, content) => writeFile(path.join(workDir, fileName), content),
    writeJson: (fileName, value) => writeFile(path.join(workDir, fileName), JSON.stringify(value, null, 2)),
    /** Renames the folder to <date>, replacing any earlier backup from the same day. */
    async commit() {
      await rm(finalDir, { recursive: true, force: true });
      await rename(workDir, finalDir);
    },
  };
}
