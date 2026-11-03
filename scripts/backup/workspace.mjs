// --everything: backs up every page and database the integration can see,
// not just the dashboard's databases.
//
//   <date>/
//     databases/Reading list-1a2b3c4d.json   columns, and every row with its page content
//     databases/Reading list-1a2b3c4d.csv    the rows, to open in Excel
//     pages/Trip notes-5e6f7a8b.json         a page and its content
//     files/<id>-photo.jpg                   images and attachments uploaded to Notion
//
// Starts from Notion's search, then also follows the child pages and
// databases it finds inside pages, since search can lag behind new pages.

import { NotionError } from "./notion.mjs";
import { columnsOf, fileNameFor, hostedFiles, titleOf, toCsv } from "./format.mjs";

const plainId = (id) => id.replace(/-/g, "");

/** Returns one result per item, like the dashboard mode: a name, and its rows or error. */
export async function backUpWorkspace(notion, backupWriter) {
  const results = [];
  const files = [];
  const queue = [];
  const queued = new Set();

  function enqueue(kind, id, foundBy) {
    if (queued.has(plainId(id))) return;
    queued.add(plainId(id));
    queue.push({ kind, id, foundBy });
  }

  // Pages and databases inside a page are backed up as items of their own.
  const followChildren = (block) => {
    if (block.type === "child_page") enqueue("page", block.id, "crawl");
    if (block.type === "child_database") enqueue("database", block.id, "crawl");
  };

  for (const item of await notion.searchAll()) {
    // Database rows are saved with their database, content included.
    if (item.object === "page" && item.parent?.type === "database_id") continue;
    enqueue(item.object, item.id, "search");
  }
  console.log(`Found ${queue.length} pages and databases`);

  while (queue.length) {
    const item = queue.shift();
    try {
      const saved =
        item.kind === "database"
          ? await backUpDatabase(notion, backupWriter, item.id, followChildren)
          : await backUpPage(notion, backupWriter, item.id, followChildren);
      files.push(...saved.files);
      results.push(saved.result);
      console.log(`  ✓ ${saved.result.name}${saved.result.rows === undefined ? "" : ` (${saved.result.rows} rows)`}`);
    } catch (error) {
      // A linked view of a database the integration can't see shows up as a
      // child database it can't open: not worth failing every night over.
      if (item.foundBy === "crawl" && error instanceof NotionError && error.status === 404) continue;
      results.push({ name: `${item.kind} ${item.id}`, error: error.message });
      console.log(`  ✗ ${item.kind} ${item.id}: ${error.message}`);
    }
  }

  results.push(...(await downloadFiles(backupWriter, files)));
  return results;
}

async function backUpPage(notion, backupWriter, id, followChildren) {
  const page = await notion.getPage(id);
  const blocks = await notion.getBlockTree(id, followChildren);
  const name = fileNameFor(titleOf(page), id);
  await backupWriter.writeJson(`pages/${name}.json`, { page, blocks });
  return { result: { name: `pages/${name}` }, files: hostedFiles({ page, blocks }) };
}

async function backUpDatabase(notion, backupWriter, id, followChildren) {
  const database = await notion.getDatabase(id);
  const pages = await notion.getAllPages(id);
  const rows = [];
  for (const page of pages) {
    rows.push({ page, blocks: await notion.getBlockTree(page.id, followChildren) });
  }
  const name = fileNameFor(titleOf(database), id);
  await backupWriter.writeJson(`databases/${name}.json`, { database, rows });
  await backupWriter.writeFile(`databases/${name}.csv`, toCsv(columnsOf(database), pages));
  return { result: { name: `databases/${name}`, rows: pages.length }, files: hostedFiles({ database, rows }) };
}

/** Saves each uploaded file as files/<owner id>-<name>, while Notion's links still work. */
async function downloadFiles(backupWriter, files) {
  const results = [];
  const used = new Set();
  for (const file of files) {
    let name = `${plainId(file.ownerId ?? "unknown").slice(0, 8)}-${file.name}`;
    for (let n = 2; used.has(name); n++) name = `${plainId(file.ownerId ?? "unknown").slice(0, 8)}-${n}-${file.name}`;
    used.add(name);
    try {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error(`download failed: ${res.status}`);
      await backupWriter.writeFile(`files/${name}`, Buffer.from(await res.arrayBuffer()));
    } catch (error) {
      results.push({ name: `files/${name}`, error: error.message });
      console.log(`  ✗ files/${name}: ${error.message}`);
    }
  }
  if (files.length) console.log(`Downloaded ${files.length - results.length} of ${files.length} files`);
  return results;
}
