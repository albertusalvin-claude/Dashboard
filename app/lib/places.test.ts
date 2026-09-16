import { describe, expect, it } from "vitest";
import { citiesInState, isKnownState, lookupCity, resolvePlace } from "./places";

describe("resolvePlace", () => {
  it("resolves a city to its own coordinates", () => {
    const place = resolvePlace("Melbourne");
    expect(place).toMatchObject({ label: "Melbourne", countryId: "036" });
    expect(place!.lat).toBeCloseTo(-37.81, 2);
    expect(place!.lon).toBeCloseTo(144.96, 2);
  });

  it("prefers the city over the country it is qualified with", () => {
    const city = resolvePlace("Jakarta, Indonesia");
    const country = resolvePlace("Indonesia");
    expect(city!.label).toBe("Jakarta");
    expect(country!.label).toBe("Indonesia");
    expect(city!.key).not.toBe(country!.key);
  });

  it("ignores case, spacing and accents", () => {
    const keys = ["melbourne", "  MELBOURNE  ", "Melbourne, AU"].map((input) => resolvePlace(input)!.key);
    expect(new Set(keys).size).toBe(1);
    expect(resolvePlace("Zürich")!.label).toBe("Zurich");
  });

  it("understands the names people actually type for countries", () => {
    const usa = resolvePlace("United States of America")!.key;
    for (const alias of ["USA", "U.S.A.", "the US", "America"]) {
      expect(resolvePlace(alias)!.key).toBe(usa);
    }
    expect(resolvePlace("England")!.label).toBe("United Kingdom");
  });

  it("tolerates names written without their spaces", () => {
    expect(resolvePlace("Hongkong")!.key).toBe(resolvePlace("Hong Kong")!.key);
    expect(resolvePlace("NewYork")!.label).toBe("New York");
    expect(resolvePlace("unitedkingdom")!.label).toBe("United Kingdom");
  });

  it("pins countries the basemap is too coarse to draw", () => {
    const singapore = resolvePlace("Singapore");
    expect(singapore).toMatchObject({ label: "Singapore", countryId: null });
    expect(singapore!.lat).toBeCloseTo(1.35, 2);
  });

  it("groups everyone in one place under the same key", () => {
    const a = resolvePlace("KL")!;
    const b = resolvePlace("Kuala Lumpur, Malaysia")!;
    expect(a.key).toBe(b.key);
    expect(a.lon).toBe(b.lon);
  });

  it("falls back to the state when that is all there is", () => {
    const state = resolvePlace("Victoria");
    expect(state).toMatchObject({ label: "Victoria", kind: "state" });
    // Anchored among the state's known cities, so it lands in Victoria.
    expect(state!.lat).toBeCloseTo(-37.81, 1);
  });

  it("prefers the country over a state of the same name", () => {
    // Georgia the country is a far likelier home than Georgia the US state.
    expect(resolvePlace("Georgia")).toMatchObject({ kind: "country" });
    expect(isKnownState("Georgia")).toBe(true);
  });

  it("knows which state a city belongs to", () => {
    expect(lookupCity("Melbourne")).toMatchObject({ state: "Victoria", country: "Australia" });
    expect(lookupCity("melbourne, australia")?.state).toBe("Victoria");
    expect(lookupCity("Jakarta")?.state).toBe("Jakarta");
    // City-states have no province of their own.
    expect(lookupCity("Singapore")?.state).toBe("");
    expect(lookupCity("Narnia")).toBeNull();
  });

  it("lists the cities inside a state, for narrowing the dropdown", () => {
    expect(citiesInState("Victoria")).toEqual(["Melbourne"]);
    expect(citiesInState("California")).toEqual(["Los Angeles", "San Diego", "San Francisco", "San Jose"]);
    expect(citiesInState("new south wales")).toContain("Sydney");
    expect(citiesInState("Narnia")).toEqual([]);
  });

  it("returns null for places it does not know, rather than guessing", () => {
    expect(resolvePlace("")).toBeNull();
    expect(resolvePlace("   ")).toBeNull();
    expect(resolvePlace("Narnia")).toBeNull();
  });
});
