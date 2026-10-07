// Snapshots every Notion database the dashboard uses into a dated folder:
//
//   <out>/2026-10-07/
//     tasks.json      the database's columns and every row, exactly as Notion
//                     returns them (ids, relations, timestamps) — enough to
//                     restore from or diff against another day
//     tasks.csv       the same rows flattened, to open in Excel
//     …one pair per database
//     manifest.json   when it ran, and each database's row count or error
//
//   node --env-file=.env.local scripts/backup/backup-notion.mjs
//   node --env-file=.env.local scripts/backup/backup-notion.mjs --out "D:\Somewhere else"
//
// <out> defaults to OneDrive\Backups\Notion: outside this repo, and synced
// off the machine. Only reads from Notion. Prints database names and row
// counts, never data or the key. Exits 1 if anything failed, so a scheduled
// run shows it.
// Caveat: Will override the earlier run on the same day due to the naming convention

import { createBackupWriter } from "./backup-writer.mjs";
import { readConfig } from "./config.mjs";
import { columnsOf, toCsv } from "./format.mjs";
import { assertNotTrackedByGit } from "./git-guard.mjs";
import { notionClient } from "./notion.mjs";

async function main() {
  const { apiKey, outRoot, databases } = readConfig(process.env, process.argv.slice(2));
  assertNotTrackedByGit(outRoot);

  const notion = notionClient(apiKey);
  const backupWriter = await createBackupWriter(outRoot);
  console.log(`Backing up ${databases.length} databases to ${backupWriter.finalDir}`);

  const results = [];
  for (const db of databases) {
    results.push(await backUpDatabase(notion, backupWriter, db));
  }

  await backupWriter.writeJson("manifest.json", { takenAt: new Date().toISOString(), databases: results });
  await backupWriter.commit();

  const failed = results.filter((r) => r.error).length;
  console.log(failed ? `Done, but ${failed} failed — see above.` : "Done.");
  return failed ? 1 : 0;
}

/** Saves one database as JSON and CSV. A failure is reported, not thrown, so the rest still run. */
async function backUpDatabase(notion, backupWriter, db) {
  const label = db.name.padEnd(28);
  try {
    const database = await notion.getDatabase(db.id);
    const pages = await notion.getAllPages(db.id);
    await backupWriter.writeJson(`${db.name}.json`, { database, pages });
    await backupWriter.writeFile(`${db.name}.csv`, toCsv(columnsOf(database), pages));
    console.log(`  ✓ ${label} ${pages.length} rows`);
    return { name: db.name, envVar: db.envVar, rows: pages.length };
  } catch (error) {
    console.log(`  ✗ ${label} ${error.message}`);
    return { name: db.name, envVar: db.envVar, error: error.message };
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error.message);
    process.exit(1);
  }
);
