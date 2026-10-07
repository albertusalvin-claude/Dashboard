import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBackupWriter, todayInMelbourne } from "./backup-writer.mjs";

describe("todayInMelbourne", () => {
  it("dates by Melbourne's calendar, not UTC", () => {
    // 2026-10-07 14:30 UTC is already the 8th in Melbourne (UTC+11).
    expect(todayInMelbourne(new Date("2026-10-07T14:30:00Z"))).toBe("2026-10-08");
  });
});

describe("createBackupWriter", () => {
  let root;
  afterEach(() => root && rm(root, { recursive: true, force: true }));

  it("only shows the dated folder once committed, replacing that day's earlier one", async () => {
    root = await mkdtemp(path.join(tmpdir(), "backup-writer-test-"));

    const first = await createBackupWriter(root, "2026-01-01");
    await first.writeFile("a.csv", "old");
    await first.writeFile("stale.csv", "gone after the rerun");
    await first.commit();

    const second = await createBackupWriter(root, "2026-01-01");
    await second.writeFile("a.csv", "new");
    expect(readFileSync(path.join(root, "2026-01-01", "a.csv"), "utf8")).toBe("old"); // Not committed yet.
    await second.commit();

    expect(await readdir(root)).toEqual(["2026-01-01"]);
    expect(await readdir(path.join(root, "2026-01-01"))).toEqual(["a.csv"]);
    expect(readFileSync(path.join(root, "2026-01-01", "a.csv"), "utf8")).toBe("new");
    expect(existsSync(path.join(root, "2026-01-01.incomplete"))).toBe(false);
  });
});
