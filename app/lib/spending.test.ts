import { describe, expect, it } from "vitest";
import type { SpendingEntry } from "../api/spending/route";
import { GENERAL, inProject, spendingProjectError, spendingProjects } from "./spending";

const entry = (project: string): SpendingEntry => ({
  id: project || "none",
  item: "Thing",
  amount: 10,
  category: "Other",
  date: "2026-01-01",
  notes: "",
  paymentMethod: "",
  store: "",
  project,
});

describe("spendingProjects", () => {
  it("keeps the Notion options first, even unused, then adds ones only entries have", () => {
    expect(spendingProjects(["Trip", "Garden"], [entry("Desk"), entry("Trip"), entry("")])).toEqual([
      "Trip",
      "Garden",
      "Desk",
    ]);
  });

  it("drops blanks, duplicates and General, which has its own chip", () => {
    expect(spendingProjects([" Trip ", "", "General"], [entry("Trip"), entry("  "), entry("general")])).toEqual([
      "Trip",
    ]);
  });
});

describe("inProject", () => {
  it("matches everything for All, and the named project otherwise", () => {
    expect(inProject(entry("Trip"), null)).toBe(true);
    expect(inProject(entry("Trip"), "Trip")).toBe(true);
    expect(inProject(entry("Garden"), "Trip")).toBe(false);
  });

  it("puts unassigned entries, and ones typed as General, under General", () => {
    expect(inProject(entry(""), GENERAL)).toBe(true);
    expect(inProject(entry("general"), GENERAL)).toBe(true);
    expect(inProject(entry("Trip"), GENERAL)).toBe(false);
  });
});

describe("spendingProjectError", () => {
  it("rejects commas, which Notion's select options can't hold", () => {
    expect(spendingProjectError("Trip, Japan")).toMatch(/commas/);
    expect(spendingProjectError("Japan trip")).toBeNull();
    expect(spendingProjectError("")).toBeNull();
  });
});
