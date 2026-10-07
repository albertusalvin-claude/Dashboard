// Turns Notion rows into a CSV for reading in Excel. The JSON beside it keeps
// the full detail; this is the readable copy.

const text = (rich) => (rich ?? []).map((t) => t.plain_text).join("");

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
