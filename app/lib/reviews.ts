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
});

/** A review's editable fields, without its id or photo. */
export function draftOf(review: Review): ReviewDraft {
  const { name, type, category, rating, price, worthIt, wouldPurchaseAgain, date, spendingId, notes } = review;
  return { name, type, category, rating, price, worthIt, wouldPurchaseAgain, date, spendingId, notes };
}

export function reviewTypeFrom(name: string | undefined): ReviewType {
  return REVIEW_TYPES.find((t) => t.toLowerCase() === name?.trim().toLowerCase()) ?? "Item";
}

/** Why a draft can't be saved, or null if it can. */
export function reviewError(draft: ReviewDraft): string | null {
  if (!draft.name.trim()) return "A name is required.";
  if (draft.rating !== null && !(draft.rating >= 0 && draft.rating <= RATING_MAX)) {
    return `The rating has to be between 0 and ${RATING_MAX}.`;
  }
  if (draft.price !== null && !(draft.price >= 0)) return "The price can't be negative.";
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

export type ReviewFilter = { type: ReviewType | null; category: string | null };

/** Newest first; undated ones last, by name. */
export function filterReviews(reviews: Review[], { type, category }: ReviewFilter): Review[] {
  return reviews
    .filter((r) => (type === null || r.type === type) && (category === null || r.category === category))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.name.localeCompare(b.name));
}

export type ReviewSummary = {
  count: number;
  /** Of the rated ones; null when none are. */
  averageRating: number | null;
  /** 0–1, or null when there are no reviews. */
  worthItShare: number | null;
  wouldPurchaseAgainShare: number | null;
  /** What was paid for the ones that weren't worth it. */
  notWorthItSpend: number;
};

export function summarizeReviews(reviews: Review[]): ReviewSummary {
  const rated = reviews.filter((r) => r.rating !== null);
  const share = (pick: (r: Review) => boolean) =>
    reviews.length ? reviews.filter(pick).length / reviews.length : null;
  return {
    count: reviews.length,
    averageRating: rated.length ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length : null,
    worthItShare: share((r) => r.worthIt),
    wouldPurchaseAgainShare: share((r) => r.wouldPurchaseAgain),
    notWorthItSpend: reviews.filter((r) => !r.worthIt).reduce((sum, r) => sum + (r.price ?? 0), 0),
  };
}

/** Categories in use, alphabetically, for the filter. */
export function reviewCategories(reviews: Review[]): string[] {
  return [...new Set(reviews.map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export const formatPrice = (price: number | null) =>
  price === null ? "—" : price.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });

/** "8.5" or "8" — a whole rating without the ".0". */
export const formatRating = (rating: number) => (Number.isInteger(rating) ? String(rating) : rating.toFixed(1));
