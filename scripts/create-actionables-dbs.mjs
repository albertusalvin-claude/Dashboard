// Creates the Actionables tab's two databases — Habits and Tasks — in Notion,
// or adds the columns the app needs to databases you've already made.
//
//   node --env-file=.env.local scripts/create-actionables-dbs.mjs --habits-page <url> --tasks-page <url> --dry-run
//   node --env-file=.env.local scripts/create-actionables-dbs.mjs --habits-page <url> --tasks-page <url>
//   node --env-file=.env.local scripts/create-actionables-dbs.mjs --parent <url>      (both on one page)
//   node --env-file=.env.local scripts/create-actionables-dbs.mjs --habits-db <url> --tasks-db <url>
//     (existing databases: missing columns are added, existing ones left alone)
//
// Needs NOTION_API_KEY, and pages the integration has been connected to (⋯ →
// Connections). A database the integration creates is shared with it
// automatically. A database whose title already exists on that page is skipped, so
// running it twice won't duplicate anything.
//
// Prints the env lines to add to .env.local and Vercel. Never prints the key.

const API_KEY = process.env.NOTION_API_KEY;
if (!API_KEY) {
  console.error("NOTION_API_KEY isn't set. Run with: node --env-file=.env.local scripts/create-actionables-dbs.mjs");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data.message ?? JSON.stringify(data)}`);
  return data;
}

/** A 32-hex page or database ID from a bare ID or a Notion URL. */
function pageIdFrom(value) {
  // The query string is dropped first: a database link's ?v=… is a view ID.
  const hex = value.split("?")[0].replace(/-/g, "").match(/[0-9a-f]{32}(?=[^0-9a-f]*$)/i);
  if (!hex) throw new Error(`Couldn't find a page ID in "${value}".`);
  return hex[0];
}

const plain = (rich) => (rich ?? []).map((t) => t.plain_text).join("");

async function pageTitle(pageId) {
  const page = await notion("GET", `/pages/${pageId}`);
  const titleProp = Object.values(page.properties).find((p) => p.type === "title");
  return plain(titleProp?.title) || "(untitled)";
}

// Only a same-named database on the same page counts — "Tasks" is a common
// enough title that one elsewhere in the workspace may be something else.
async function existingDatabase(title, parentId) {
  const found = await notion("POST", "/search", { query: title, filter: { property: "object", value: "database" } });
  return found.results.find(
    (db) =>
      plain(db.title) === title &&
      !db.archived &&
      !db.in_trash &&
      db.parent?.page_id?.replace(/-/g, "") === parentId
  );
}

// The properties app/lib/getActionables.ts reads. Created and last-edited
// times come from Notion's own page metadata, so they need no property.
const DATABASES = [
  {
    title: "Habits",
    envVar: "NOTION_HABITS_ID",
    pageFlag: "--habits-page",
    dbFlag: "--habits-db",
    schema: {
      Name: { title: {} },
      Order: { number: {} },
      Category: {
        select: {
          options: [
            { name: "Money", color: "orange" },
            { name: "Health", color: "green" },
            { name: "Relationship", color: "yellow" },
            { name: "Other", color: "gray" },
          ],
        },
      },
      "End date": { date: {} },
      Description: { rich_text: {} },
    },
  },
  {
    title: "Tasks",
    envVar: "NOTION_TASKS_ID",
    pageFlag: "--tasks-page",
    dbFlag: "--tasks-db",
    schema: {
      Name: { title: {} },
      Order: { number: {} },
      Status: {
        select: {
          options: [
            { name: "Todo", color: "gray" },
            { name: "Doing", color: "yellow" },
            { name: "Done", color: "green" },
          ],
        },
      },
      "Due date": { date: {} },
      Description: { rich_text: {} },
    },
    // A relation to its own database can only point at an id that exists, so
    // it's added once the database has been created.
    afterCreate: (id) => ({ "Parent task": { relation: { database_id: id, single_property: {} } } }),
  },
];

/**
 * Brings an existing database up to the schema: renames its title column to
 * Name if needed and adds whichever columns are missing. A column that already
 * exists under the right name is left as it is.
 */
async function completeDatabase(title, databaseId, schema, afterCreate) {
  const db = await notion("GET", `/databases/${databaseId}`);
  const wanted = { ...schema, ...(afterCreate ? afterCreate(db.id) : {}) };
  const changes = {};
  const titleName = Object.entries(db.properties).find(([, p]) => p.type === "title")?.[0];
  if (titleName && titleName !== "Name") changes[titleName] = { name: "Name" };
  for (const [name, definition] of Object.entries(wanted)) {
    if (name === "Name" || db.properties[name]) continue;
    changes[name] = definition;
  }
  const names = Object.keys(changes);
  console.log(`${title} → existing database "${plain(db.title)}"`);
  if (names.length === 0) console.log(`• ${title}: already has every column`);
  else if (dryRun) console.log(`• ${title}: would add ${names.join(", ")}`);
  else {
    await notion("PATCH", `/databases/${db.id}`, { properties: changes });
    console.log(`• ${title}: added ${names.join(", ")}`);
  }
}

if (dryRun) console.log("Dry run — nothing will be changed.\n");

const envLines = [];
for (const { title, envVar, pageFlag, dbFlag, schema, afterCreate } of DATABASES) {
  if (flag(dbFlag)) {
    const databaseId = pageIdFrom(flag(dbFlag));
    await completeDatabase(title, databaseId, schema, afterCreate);
    envLines.push(`${envVar}=${databaseId}`);
    continue;
  }
  const target = flag(pageFlag) ?? flag("--parent");
  if (!target) throw new Error(`Pass ${pageFlag} <page URL> (or --parent <page URL> for both).`);
  const parentId = pageIdFrom(target);
  console.log(`${title} → page "${await pageTitle(parentId)}"`);

  const existing = await existingDatabase(title, parentId);
  if (existing) {
    console.log(`• ${title}: already exists, skipped (${existing.url})`);
    envLines.push(`${envVar}=${existing.id.replace(/-/g, "")}`);
    continue;
  }
  if (dryRun) {
    console.log(`• ${title}: would create`);
    continue;
  }

  const db = await notion("POST", "/databases", {
    parent: { type: "page_id", page_id: parentId },
    title: [{ text: { content: title } }],
    properties: schema,
  });
  if (afterCreate) await notion("PATCH", `/databases/${db.id}`, { properties: afterCreate(db.id) });
  console.log(`• ${title}: created — ${db.url}`);
  envLines.push(`${envVar}=${db.id.replace(/-/g, "")}`);
}

if (envLines.length) {
  console.log("\nAdd to .env.local and the Vercel project:\n");
  for (const line of envLines) console.log(line);
}
