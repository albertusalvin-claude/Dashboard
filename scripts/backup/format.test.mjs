import { describe, expect, it } from "vitest";
import { columnsOf, flatten, toCsv } from "./format.mjs";

describe("flatten", () => {
  it("turns each kind of property into a plain cell", () => {
    expect(flatten({ type: "title", title: [{ plain_text: "Buy " }, { plain_text: "milk" }] })).toBe("Buy milk");
    expect(flatten({ type: "number", number: 0 })).toBe(0);
    expect(flatten({ type: "number", number: null })).toBe("");
    expect(flatten({ type: "select", select: null })).toBe("");
    expect(flatten({ type: "multi_select", multi_select: [{ name: "A" }, { name: "B" }] })).toBe("A; B");
    expect(flatten({ type: "date", date: { start: "2026-01-01", end: "2026-01-03" } })).toBe("2026-01-01 → 2026-01-03");
    expect(flatten({ type: "checkbox", checkbox: false })).toBe("false");
    expect(flatten({ type: "relation", relation: [{ id: "p1" }, { id: "p2" }] })).toBe("p1; p2");
    expect(flatten({ type: "formula", formula: { type: "number", number: 42 } })).toBe(42);
    expect(flatten({ type: "unique_id", unique_id: { prefix: "T", number: 7 } })).toBe("T-7");
    expect(flatten(undefined)).toBe("");
  });
});

describe("columnsOf", () => {
  it("puts the title column first", () => {
    const database = { properties: { Order: { type: "number" }, Name: { type: "title" }, Status: { type: "select" } } };
    expect(columnsOf(database)).toEqual(["Name", "Order", "Status"]);
  });
});

describe("toCsv", () => {
  it("quotes cells with commas, quotes and newlines, in column order", () => {
    const csv = toCsv(
      ["Name", "Note"],
      [
        {
          id: "p1",
          created_time: "c",
          last_edited_time: "e",
          properties: {
            Note: { type: "rich_text", rich_text: [{ plain_text: 'Say "hi",\nthen go' }] },
            Name: { type: "title", title: [{ plain_text: "Plain" }] },
          },
        },
      ]
    );
    expect(csv).toBe('﻿id,created_time,last_edited_time,Name,Note\r\np1,c,e,Plain,"Say ""hi"",\nthen go"\r\n');
  });
});
