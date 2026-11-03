// Shapes for the Experience tab's reviews — a Notion database of things bought and done,
// each scored. Pure, so the server (reading/writing Notion) and the client
// share it.

import type { SpendingEntry } from "../api/spending/route";

export const REVIEW_TYPES = ["Item", "Experience"] as const;
export type ReviewType = (typeof REVIEW_TYPES)[number];

export const RATING_MAX = 10;

export type Review = {
  id: string;
  name: string;
  type: ReviewType;
  /** Free text, like Spending's categories; empty when not set. */
  category: string;
  /** 0–10, or null when not rated yet. */
  rating: number | null;
  /** AUD, or null when unknown (a gift, say). */
  price: number | null;
  worthIt: boolean;
  wouldPurchaseAgain: boolean;
  /** YYYY-MM-DD. */
  date: string | null;
  /** The Spending entry this was bought with, if it's linked to one. */
  spendingId: string | null;
  notes: string;
  /** From the Tags multi-select, whose options are the full tag list. */
  tags: string[];
  /** A photo uploaded to Notion, or null. */
  image: ReviewImage | null;
};

export type ReviewImage = {
  /** Notion's link to it, which expires within the hour — fetched fresh on every page load. */
  url: string;
  name: string;
};

/** What the form edits. The photo is uploaded separately, not typed. */
export type ReviewDraft = Omit<Review, "id" | "image">;

/** What to do with a review's photo on save. */
export type PhotoChange = { kind: "keep" } | { kind: "remove" } | { kind: "replace"; photo: FormData };

export const blankReview = (): ReviewDraft => ({
  name: "",
  type: "Item",
  category: "",
  rating: null,
  price: null,
  worthIt: false,
  wouldPurchaseAgain: false,
  date: null,
  spendingId: null,
  notes: "",
  tags: [],
});

/** A review's editable fields, without its id or photo. */
export function draftOf(review: Review): ReviewDraft {
  const { name, type, category, rating, price, worthIt, wouldPurchaseAgain, date, spendingId, notes, tags } = review;
  return { name, type, category, rating, price, worthIt, wouldPurchaseAgain, date, spendingId, notes, tags };
}

export function reviewTypeFrom(name: string | undefined): ReviewType {
  return REVIEW_TYPES.find((t) => t.toLowerCase() === name?.trim().toLowerCase()) ?? "Item";
}

/**
 * A typed tag as it'll be stored: trimmed, inner spaces collapsed, and
 * spelled like an existing tag that matches in any case, so "Gift" doesn't
 * end up beside "gift". Null if there's nothing left or Notion won't take it.
 */
export function cleanTag(typed: string, existing: string[]): string | null {
  const tag = typed.trim().replace(/\s+/g, " ");
  // Notion's option names can't contain commas, and stop at 100 characters.
  if (!tag || tag.includes(",") || tag.length > 100) return null;
  return existing.find((t) => t.toLowerCase() === tag.toLowerCase()) ?? tag;
}

/** Why a draft can't be saved, or null if it can. */
export function reviewError(draft: ReviewDraft): string | null {
  if (!draft.name.trim()) return "A name is required.";
  if (draft.rating !== null && !(draft.rating >= 0 && draft.rating <= RATING_MAX)) {
    return `The rating has to be between 0 and ${RATING_MAX}.`;
  }
  if (draft.price !== null && !(draft.price >= 0)) return "The price can't be negative.";
  if (draft.tags.some((t) => cleanTag(t, []) !== t)) return "Tags can't be empty, contain commas, or run past 100 characters.";
  return null;
}

/**
 * Links a review to a Spending entry, filling in whatever the review doesn't
 * have yet from the purchase — never overwriting what's already been typed.
 */
export function linkSpending(draft: ReviewDraft, entry: SpendingEntry | undefined): ReviewDraft {
  if (!entry) return { ...draft, spendingId: null };
  return {
    ...draft,
    spendingId: entry.id,
    name: draft.name.trim() ? draft.name : entry.item,
    price: draft.price ?? entry.amount,
    date: draft.date ?? (entry.date || null),
    category: draft.category.trim() ? draft.category : entry.category,
  };
}

export const REVIEW_SORTS = ["Newest", "Highest rated", "Most expensive"] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export type ReviewFilter = {
  /** Matched against the name, category, notes and tags, plus `searchAlso`. */
  query: string;
  type: ReviewType | null;
  category: string | null;
  /** True or false to keep only those; null for either. */
  worthIt: boolean | null;
  wouldPurchaseAgain: boolean | null;
  /** Only reviews with every one of these tags. */
  tags: string[];
  sort: ReviewSort;
};

export const NO_FILTER: ReviewFilter = {
  query: "",
  type: null,
  category: null,
  worthIt: null,
  wouldPurchaseAgain: null,
  tags: [],
  sort: "Newest",
};

/** Whether anything narrows the list (the sort doesn't). */
export const isFiltering = (f: ReviewFilter) =>
  f.query.trim() !== "" || f.type !== null || f.category !== null || f.worthIt !== null || f.wouldPurchaseAgain !== null || f.tags.length > 0;

const byNewest = (a: Review, b: Review) => (b.date ?? "").localeCompare(a.date ?? "") || a.name.localeCompare(b.name);

// Highest first, with the unrated or unpriced last; ties newest first.
const byDescending = (pick: (r: Review) => number | null) => (a: Review, b: Review) =>
  (pick(b) ?? -Infinity) - (pick(a) ?? -Infinity) || byNewest(a, b);

const SORTERS: Record<ReviewSort, (a: Review, b: Review) => number> = {
  Newest: byNewest,
  "Highest rated": byDescending((r) => r.rating),
  "Most expensive": byDescending((r) => r.price),
};

/**
 * The reviews that match, in the chosen order. Every word of the query has
 * to appear somewhere, in any case. `searchAlso` adds text to search that
 * isn't on the review itself, like the store it was bought from.
 */
export function filterReviews(reviews: Review[], filter: ReviewFilter, searchAlso: (r: Review) => string = () => ""): Review[] {
  const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
  return reviews
    .filter((r) => {
      if (filter.type !== null && r.type !== filter.type) return false;
      if (filter.category !== null && r.category !== filter.category) return false;
      if (filter.worthIt !== null && r.worthIt !== filter.worthIt) return false;
      if (filter.wouldPurchaseAgain !== null && r.wouldPurchaseAgain !== filter.wouldPurchaseAgain) return false;
      if (!filter.tags.every((t) => r.tags.includes(t))) return false;
      const haystack = `${r.name} ${r.category} ${r.notes} ${r.tags.join(" ")} ${searchAlso(r)}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    })
    .sort(SORTERS[filter.sort]);
}

/** Categories in use, alphabetically, for the filter. */
export function reviewCategories(reviews: Review[]): string[] {
  return [...new Set(reviews.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export const formatPrice = (price: number | null) =>
  price === null ? "—" : price.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });

/** "8.5" or "8" — a whole rating without the ".0". */
export const formatRating = (rating: number) => (Number.isInteger(rating) ? String(rating) : rating.toFixed(1));
