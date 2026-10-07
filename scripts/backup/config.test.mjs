import path from "node:path";
import { describe, expect, it } from "vitest";
import { databasesFromEnv, readConfig } from "./config.mjs";

describe("databasesFromEnv", () => {
  it("finds every NOTION_*_ID, named in camelCase, skipping the key and blanks", () => {
    const dbs = databasesFromEnv({
      NOTION_API_KEY: "secret",
      NOTION_TASKS_ID: "t1",
      NOTION_MONEY_PROJECTION_ASSUMPTIONS_ID: " m1 ",
      NOTION_EMPTY_ID: "",
      OTHER_ID: "x",
    });
    expect(dbs).toEqual([
      { envVar: "NOTION_MONEY_PROJECTION_ASSUMPTIONS_ID", name: "moneyProjectionAssumptions", id: "m1" },
      { envVar: "NOTION_TASKS_ID", name: "tasks", id: "t1" },
    ]);
  });
});

describe("readConfig", () => {
  const env = { NOTION_API_KEY: "k", NOTION_TASKS_ID: "t1" };

  it("prefers --out, then NOTION_BACKUP_DIR", () => {
    expect(readConfig({ ...env, NOTION_BACKUP_DIR: "/env" }, ["--out", "/flag"]).outRoot).toBe(path.resolve("/flag"));
    expect(readConfig({ ...env, NOTION_BACKUP_DIR: "/env" }, []).outRoot).toBe(path.resolve("/env"));
  });

  it("needs a key and at least one database", () => {
    expect(() => readConfig({ NOTION_TASKS_ID: "t1" }, [])).toThrow(/NOTION_API_KEY/);
    expect(() => readConfig({ NOTION_API_KEY: "k" }, [])).toThrow(/nothing to back up/);
  });
});
