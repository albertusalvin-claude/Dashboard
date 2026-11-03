import { describe, expect, it } from "vitest";
import type { SpendingEntry } from "../api/spending/route";
import { fitWithin } from "./shrinkPhoto";
import {
  blankReview,
  cleanTag,
  filterReviews,
  linkSpending,
  reviewCategories,
  reviewError,
  reviewTypeFrom,
  isFiltering,
  NO_FILTER,
  type Review,
  type ReviewFilter,
} from "./reviews";

const review = (id: string, extra: Partial<Review> = {}): Review => ({ ...blankReview(), id, name: id, image: null, ...extra });

const purchase: SpendingEntry = {
  id: "sp-1",
  item: "Rain jacket",
  amount: 120,
  category: "Clothing",
  date: "2026-03-04",
  notes: "",
  paymentMethod: "Card",
  store: "Kathmandu",
};

describe("linkSpending", () => {
  it("fills in what the review doesn't have from the purchase", () => {
    expect(linkSpending(blankReview(), purchase)).toMatchObject({
      spendingId: "sp-1",
      name: "Rain jacket",
      price: 120,
      date: "2026-03-04",
      category: "Clothing",
    });
  });

  it("never overwrites what's been typed, and unlinking keeps the rest", () => {
    const typed = { ...blankReview(), name: "My jacket", price: 99, date: "2026-03-05", category: "Outdoors" };
    const linked = linkSpending(typed, purchase);
    expect(linked).toMatchObject({ spendingId: "sp-1", name: "My jacket", price: 99, date: "2026-03-05", category: "Outdoors" });
    expect(linkSpending(linked, undefined)).toMatchObject({ spendingId: null, name: "My jacket", price: 99 });
  });

  it("keeps a price of 0 rather than treating it as missing", () => {
    expect(linkSpending({ ...blankReview(), price: 0 }, purchase).price).toBe(0);
  });
});

describe("cleanTag", () => {
  it("tidies a typed tag and reuses an existing one's spelling", () => {
    expect(cleanTag("  date   night ", [])).toBe("date night");
    expect(cleanTag("GIFT", ["Gift", "Travel"])).toBe("Gift");
    expect(cleanTag("New one", ["Gift"])).toBe("New one");
  });

  it("refuses what Notion won't store", () => {
    expect(cleanTag("   ", [])).toBeNull();
    expect(cleanTag("a, b", [])).toBeNull();
    expect(cleanTag("x".repeat(101), [])).toBeNull();
  });
});

describe("reviewError", () => {
  it("needs a name and keeps the rating within 0–10", () => {
    expect(reviewError({ ...blankReview(), name: " " })).toMatch(/name/);
    expect(reviewError({ ...blankReview(), name: "x", rating: 11 })).toMatch(/between 0 and 10/);
    expect(reviewError({ ...blankReview(), name: "x", rating: -1 })).toMatch(/between 0 and 10/);
    expect(reviewError({ ...blankReview(), name: "x", rating: 0, price: 0 })).toBeNull();
    expect(reviewError({ ...blankReview(), name: "x", price: -5 })).toMatch(/negative/);
    expect(reviewError({ ...blankReview(), name: "x", tags: ["ok", "a,b"] })).toMatch(/Tags/);
  });
});

describe("filterReviews", () => {
  const reviews = [
    review("old", { date: "2026-01-01", type: "Experience", category: "Food", rating: 9, price: 40, worthIt: true }),
    review("undated", { type: "Experience", category: "Food", rating: null, price: null }),
    review("new", { date: "2026-02-01", type: "Experience", category: "Food", rating: 5, price: 120, notes: "Too loud" }),
    review("item", { date: "2026-03-01", type: "Item", category: "Tech", rating: 7, price: 300, wouldPurchaseAgain: true }),
  ];
  const ids = (filter: Partial<ReviewFilter>, searchAlso?: (r: Review) => string) =>
    filterReviews(reviews, { ...NO_FILTER, ...filter }, searchAlso).map((r) => r.id);

  it("shows everything newest first with nothing set, undated ones last", () => {
    expect(ids({})).toEqual(["item", "new", "old", "undated"]);
  });

  it("narrows by type, category, worth it and would buy again", () => {
    expect(ids({ type: "Experience", category: "Food" })).toEqual(["new", "old", "undated"]);
    expect(ids({ worthIt: true })).toEqual(["old"]);
    expect(ids({ worthIt: false, type: "Experience" })).toEqual(["new", "undated"]);
    expect(ids({ wouldPurchaseAgain: true })).toEqual(["item"]);
  });

  it("searches every word, in any case, across name, category, notes and extra text", () => {
    expect(ids({ query: "LOUD" })).toEqual(["new"]);
    expect(ids({ query: "food too" })).toEqual(["new"]);
    expect(ids({ query: "tech" })).toEqual(["item"]);
    expect(ids({ query: "kathmandu" }, (r) => (r.id === "old" ? "Kathmandu" : ""))).toEqual(["old"]);
    expect(ids({ query: "nothing like this" })).toEqual([]);
  });

  it("sorts by rating or price, highest first, with the missing ones last", () => {
    expect(ids({ sort: "Highest rated" })).toEqual(["old", "item", "new", "undated"]);
    expect(ids({ sort: "Most expensive" })).toEqual(["item", "new", "old", "undated"]);
  });

  it("keeps only reviews with every chosen tag, and searches tags too", () => {
    const tagged = [review("a", { tags: ["Gift", "Travel"] }), review("b", { tags: ["Travel"] }), review("c")];
    const ids = (filter: Partial<ReviewFilter>) => filterReviews(tagged, { ...NO_FILTER, ...filter }).map((r) => r.id);
    expect(ids({ tags: ["Travel"] })).toEqual(["a", "b"]);
    expect(ids({ tags: ["Travel", "Gift"] })).toEqual(["a"]);
    expect(ids({ query: "gift" })).toEqual(["a"]);
    expect(isFiltering({ ...NO_FILTER, tags: ["Gift"] })).toBe(true);
  });

  it("knows when it's filtering, which the sort alone isn't", () => {
    expect(isFiltering(NO_FILTER)).toBe(false);
    expect(isFiltering({ ...NO_FILTER, sort: "Highest rated" })).toBe(false);
    expect(isFiltering({ ...NO_FILTER, query: " x " })).toBe(true);
    expect(isFiltering({ ...NO_FILTER, worthIt: false })).toBe(true);
  });
});

describe("reviewTypeFrom and reviewCategories", () => {
  it("reads the Type select, defaulting to Item, and lists categories in use", () => {
    expect(reviewTypeFrom("experience")).toBe("Experience");
    expect(reviewTypeFrom(undefined)).toBe("Item");
    expect(reviewCategories([review("a", { category: "Tech" }), review("b"), review("c", { category: "Food" }), review("d", { category: "Tech" })])).toEqual([
      "Food",
      "Tech",
    ]);
  });
});

describe("fitWithin", () => {
  it("shrinks the longest side to the limit, keeping the shape, and never enlarges", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
