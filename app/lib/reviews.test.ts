import { describe, expect, it } from "vitest";
import type { SpendingEntry } from "../api/spending/route";
import { fitWithin } from "./shrinkPhoto";
import {
  blankReview,
  filterReviews,
  linkSpending,
  reviewCategories,
  reviewError,
  reviewTypeFrom,
  summarizeReviews,
  type Review,
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

describe("reviewError", () => {
  it("needs a name and keeps the rating within 0–10", () => {
    expect(reviewError({ ...blankReview(), name: " " })).toMatch(/name/);
    expect(reviewError({ ...blankReview(), name: "x", rating: 11 })).toMatch(/between 0 and 10/);
    expect(reviewError({ ...blankReview(), name: "x", rating: -1 })).toMatch(/between 0 and 10/);
    expect(reviewError({ ...blankReview(), name: "x", rating: 0, price: 0 })).toBeNull();
    expect(reviewError({ ...blankReview(), name: "x", price: -5 })).toMatch(/negative/);
  });
});

describe("filterReviews", () => {
  it("filters by type and category, newest first with undated ones last", () => {
    const reviews = [
      review("old", { date: "2026-01-01", type: "Experience", category: "Food" }),
      review("undated", { type: "Experience", category: "Food" }),
      review("new", { date: "2026-02-01", type: "Experience", category: "Food" }),
      review("item", { date: "2026-03-01", type: "Item", category: "Food" }),
      review("travel", { date: "2026-03-01", type: "Experience", category: "Travel" }),
    ];
    expect(filterReviews(reviews, { type: "Experience", category: "Food" }).map((r) => r.id)).toEqual(["new", "old", "undated"]);
    expect(filterReviews(reviews, { type: null, category: null })).toHaveLength(5);
  });
});

describe("summarizeReviews", () => {
  it("averages the rated ones and sums what was paid for the ones not worth it", () => {
    const summary = summarizeReviews([
      review("a", { rating: 9, price: 50, worthIt: true, wouldPurchaseAgain: true }),
      review("b", { rating: 4, price: 200, worthIt: false }),
      review("c", { rating: null, price: null, worthIt: false }),
      review("d", { rating: 8, price: 30, worthIt: true, wouldPurchaseAgain: true }),
    ]);
    expect(summary).toEqual({
      count: 4,
      averageRating: 7,
      worthItShare: 0.5,
      wouldPurchaseAgainShare: 0.5,
      notWorthItSpend: 200,
    });
  });

  it("has no averages or shares with nothing to go on", () => {
    expect(summarizeReviews([])).toEqual({
      count: 0,
      averageRating: null,
      worthItShare: null,
      wouldPurchaseAgainShare: null,
      notWorthItSpend: 0,
    });
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
