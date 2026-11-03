import { describe, expect, it } from "vitest";
import { columnsOf, fileNameFor, flatten, hostedFiles, titleOf, toCsv } from "./format.mjs";

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

describe("titleOf and fileNameFor", () => {
  it("reads a page's or database's title", () => {
    expect(titleOf({ object: "database", title: [{ plain_text: "Reading list" }] })).toBe("Reading list");
    expect(titleOf({ object: "page", properties: { Name: { type: "title", title: [{ plain_text: "Trip" }] } } })).toBe("Trip");
  });

  it("makes a Windows-safe name, kept apart from same-titled pages by the id", () => {
    expect(fileNameFor('Q3: plans/ideas?', "1a2b3c4d-5e6f-0000-0000-000000000000")).toBe("Q3_ plans_ideas_-1a2b3c4d");
    expect(fileNameFor("", "9f8e7d6c5b4a")).toBe("Untitled-9f8e7d6c");
    expect(fileNameFor("x".repeat(100), "abcdef1234")).toBe(`${"x".repeat(60)}-abcdef12`);
  });
});

describe("hostedFiles", () => {
  it("finds files uploaded to Notion with the block or page they're in, but not outside links", () => {
    const page = {
      object: "page",
      id: "page-1",
      cover: { type: "external", external: { url: "https://example.com/x.png" } },
      properties: {
        Files: { id: "%3Ab", type: "files", files: [{ name: "receipt.pdf", type: "file", file: { url: "https://s3.example/a/receipt.pdf?sig=1" } }] },
      },
    };
    const blocks = [{ object: "block", id: "block-1", type: "image", image: { type: "file", file: { url: "https://s3.example/b/My%20photo.jpg?sig=2" } } }];
    expect(hostedFiles({ page, blocks })).toEqual([
      { ownerId: "page-1", url: "https://s3.example/a/receipt.pdf?sig=1", name: "receipt.pdf" },
      { ownerId: "block-1", url: "https://s3.example/b/My%20photo.jpg?sig=2", name: "My photo.jpg" },
    ]);
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
