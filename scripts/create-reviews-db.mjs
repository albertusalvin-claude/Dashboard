// Creates the Reviews database the Experience tab reads, on a page you choose.
//
//   node --env-file=.env.local scripts/create-reviews-db.mjs --page <url> --dry-run
//   node --env-file=.env.local scripts/create-reviews-db.mjs --page <url>
//   node --env-file=.env.local scripts/create-reviews-db.mjs --db <url>
//     (a database you've made: missing columns are added, existing ones left alone)
//
// Needs NOTION_API_KEY, and a page the integration has been connected to
// (⋯ → Connections). With NOTION_SPENDING_ID set, reviews get a "Spending
// entry" column linking them to the purchase. A "Reviews" database already on
// that page is reused, so running it twice won't duplicate anything.
//
// Prints the env line to add to .env.local and Vercel. Never prints the key.

const API_KEY = process.env.NOTION_API_KEY;
if (!API_KEY) {
  console.error("NOTION_API_KEY isn't set. Run with: node --env-file=.env.local scripts/create-reviews-db.mjs");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const TITLE = "Reviews";

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

/** A 32-hex page ID from a bare ID or a Notion URL. */
function pageIdFrom(value) {
  const hex = value.split("?")[0].replace(/-/g, "").match(/[0-9a-f]{32}(?=[^0-9a-f]*$)/i);
  if (!hex) throw new Error(`Couldn't find a page ID in "${value}".`);
  return hex[0];
}

const plain = (rich) => (rich ?? []).map((t) => t.plain_text).join("");

// The properties app/lib/getReviews.ts reads.
function schema(spendingId) {
  return {
    Name: { title: {} },
    Type: { select: { options: [{ name: "Item", color: "blue" }, { name: "Experience", color: "purple" }] } },
    Category: { select: {} },
    Rating: { number: { format: "number" } },
    Price: { number: { format: "australian_dollar" } },
    "Worth it": { checkbox: {} },
    "Would purchase again": { checkbox: {} },
    Date: { date: {} },
    Notes: { rich_text: {} },
    Image: { files: {} },
    ...(spendingId ? { "Spending entry": { relation: { database_id: spendingId, single_property: {} } } } : {}),
  };
}

if (!flag("--db") && !flag("--page")) {
  console.error("Pass --page <Notion page URL> to create the database there, or --db <database URL> to fill in one you've made.");
  process.exit(1);
}
const spendingId = process.env.NOTION_SPENDING_ID?.trim();
if (dryRun) console.log("Dry run — nothing will be changed.\n");
console.log(spendingId ? '• Linked to Spending through a "Spending entry" column' : "• NOTION_SPENDING_ID isn't set: no link to Spending");

const id = flag("--db") ? await completeDatabase(pageIdFrom(flag("--db"))) : await createOnPage(pageIdFrom(flag("--page")));
if (id) console.log(`\nAdd to .env.local and the Vercel project:\n\nNOTION_REVIEWS_ID=${id.replace(/-/g, "")}`);

/**
 * Brings a database you've made up to the schema: renames its title column
 * to Name if needed and adds whichever columns are missing. One that already
 * exists under the right name is left alone, even if it's a different type.
 */
async function completeDatabase(databaseId) {
  const db = await notion("GET", `/databases/${databaseId}`);
  console.log(`${TITLE} → existing database "${plain(db.title)}"`);
  const changes = {};
  const titleName = Object.entries(db.properties).find(([, p]) => p.type === "title")?.[0];
  if (titleName && titleName !== "Name") changes[titleName] = { name: "Name" };
  for (const [name, definition] of Object.entries(schema(spendingId))) {
    if (name === "Name") continue;
    const current = db.properties[name];
    if (!current) changes[name] = definition;
    else if (current.type !== Object.keys(definition)[0]) console.log(`• ${name} is a ${current.type} column; the dashboard expects ${Object.keys(definition)[0]} — left as it is`);
  }
  const names = Object.keys(changes);
  if (names.length === 0) console.log("• Already has every column");
  else if (dryRun) console.log(`• Would add: ${names.join(", ")}`);
  else {
    await notion("PATCH", `/databases/${db.id}`, { properties: changes });
    console.log(`• Added: ${names.join(", ")}`);
  }
  return db.id;
}

/** Creates the database on a page, or reuses a "Reviews" one already there. */
async function createOnPage(parentId) {
  const page = await notion("GET", `/pages/${parentId}`);
  console.log(`${TITLE} → page "${plain(Object.values(page.properties).find((p) => p.type === "title")?.title) || "(untitled)"}"`);

  const found = await notion("POST", "/search", { query: TITLE, filter: { property: "object", value: "database" } });
  const existing = found.results.find(
    (db) => plain(db.title) === TITLE && !db.archived && !db.in_trash && db.parent?.page_id?.replace(/-/g, "") === parentId
  );
  if (existing) {
    console.log(`• Already exists, skipped (${existing.url})`);
    return existing.id;
  }
  if (dryRun) {
    console.log(`• Would create "${TITLE}" with: ${Object.keys(schema(spendingId)).join(", ")}`);
    return null;
  }
  const db = await notion("POST", "/databases", {
    parent: { type: "page_id", page_id: parentId },
    title: [{ text: { content: TITLE } }],
    properties: schema(spendingId),
  });
  console.log(`• Created — ${db.url}`);
  return db.id;
}
