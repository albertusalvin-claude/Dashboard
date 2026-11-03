// Turns Notion data into files: CSVs for reading in Excel (the JSON beside
// each keeps the full detail), and names that are safe on Windows.

const text = (rich) => (rich ?? []).map((t) => t.plain_text).join("");

/** A page's or database's title, as plain text. */
export function titleOf(item) {
  if (item.object === "database") return text(item.title);
  const titleProp = Object.values(item.properties ?? {}).find((p) => p.type === "title");
  return text(titleProp?.title);
}

// Characters Windows doesn't allow in file names.
const safe = (name) =>
  name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/[. ]+$/, "")
    .trim();

/**
 * "Travel plans-1a2b3c4d": the title, cut short, plus the start of the id so
 * two pages with the same title don't overwrite each other.
 */
export function fileNameFor(title, id) {
  return `${safe(title).slice(0, 60).trim() || "Untitled"}-${id.replace(/-/g, "").slice(0, 8)}`;
}

/**
 * Every file uploaded to Notion inside `value` (images, attachments, covers,
 * files columns), with the id of the page or block it belongs to. Notion's
 * links to them expire within the hour, so they have to be downloaded during
 * the backup. Links to outside sites aren't included.
 */
export function hostedFiles(value, ownerId = null, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) hostedFiles(item, ownerId, found);
  } else if (value && typeof value === "object") {
    const owner = ["page", "block", "database"].includes(value.object) ? value.id : ownerId;
    if (value.type === "file" && value.file?.url) {
      const fromUrl = decodeURIComponent(new URL(value.file.url).pathname.split("/").pop() ?? "");
      found.push({ ownerId: owner, url: value.file.url, name: safe(value.name || fromUrl) || "file" });
    }
    for (const child of Object.values(value)) hostedFiles(child, owner, found);
  }
  return found;
}

/** One property's value as a CSV cell. */
export function flatten(prop) {
  if (!prop) return "";
  switch (prop.type) {
    case "title":
    case "rich_text":
      return text(prop[prop.type]);
    case "number":
      return prop.number ?? "";
    case "select":
    case "status":
      return prop[prop.type]?.name ?? "";
    case "multi_select":
      return prop.multi_select.map((o) => o.name).join("; ");
    case "date":
      return prop.date ? (prop.date.end ? `${prop.date.start} → ${prop.date.end}` : prop.date.start) : "";
    case "checkbox":
      return prop.checkbox ? "true" : "false";
    case "url":
    case "email":
    case "phone_number":
    case "created_time":
    case "last_edited_time":
      return prop[prop.type] ?? "";
    case "relation":
      return prop.relation.map((r) => r.id).join("; ");
    case "people":
      return prop.people.map((p) => p.name ?? p.id).join("; ");
    case "created_by":
    case "last_edited_by":
      return prop[prop.type]?.name ?? prop[prop.type]?.id ?? "";
    case "files":
      return prop.files.map((f) => f.name).join("; ");
    case "unique_id":
      return prop.unique_id.number == null ? "" : `${prop.unique_id.prefix ? `${prop.unique_id.prefix}-` : ""}${prop.unique_id.number}`;
    case "formula": {
      const f = prop.formula;
      return f.type === "date" ? (f.date?.start ?? "") : (f[f.type] ?? "");
    }
    case "rollup": {
      const r = prop.rollup;
      if (r.type === "array") return r.array.map(flatten).join("; ");
      return r.type === "date" ? (r.date?.start ?? "") : (r[r.type] ?? "");
    }
    default:
      return "";
  }
}

/** A database's column names: the title column first, then as Notion lists them. */
export function columnsOf(database) {
  return Object.entries(database.properties)
    .sort(([, a], [, b]) => (b.type === "title") - (a.type === "title"))
    .map(([name]) => name);
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Rows as CSV: the page id and timestamps, then each column. Starts with a
 * BOM so Excel reads it as UTF-8.
 */
export function toCsv(columns, pages) {
  const header = ["id", "created_time", "last_edited_time", ...columns];
  const rows = pages.map((page) => [
    page.id,
    page.created_time,
    page.last_edited_time,
    ...columns.map((c) => flatten(page.properties[c])),
  ]);
  return "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
