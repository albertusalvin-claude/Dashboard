"use client";

import { useState } from "react";
import type { SpendingEntry } from "../api/spending/route";
import {
  RATING_MAX,
  REVIEW_TYPES,
  filterReviews,
  formatPrice,
  formatRating,
  reviewCategories,
  summarizeReviews,
  type Review,
  type ReviewType,
} from "../lib/reviews";
import ReviewForm from "./ReviewForm";

type Props = {
  /** Null when the Notion database isn't configured. */
  reviews: Review[] | null;
  /** Newest first, to link reviews to purchases. */
  spending: SpendingEntry[];
};

const chipCls = (active: boolean) =>
  `font-mono text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
    active ? "bg-ink text-paper border-ink" : "border-line text-ink-soft hover:border-ink-soft hover:text-ink"
  }`;

// Green for a good score, gold for middling, chili for poor.
const ratingColor = (rating: number) => (rating >= 8 ? "var(--kale)" : rating >= 5 ? "var(--gold)" : "var(--chili)");

const percent = (share: number | null) => (share === null ? "—" : `${Math.round(share * 100)}%`);

/** "12 Oct 2026" from YYYY-MM-DD, read as a calendar date. */
function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card border border-line rounded-2xl px-4 py-3">
      <p className="text-xs font-mono uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="font-display font-bold text-2xl text-ink mt-1">{value}</p>
      {hint && <p className="text-xs text-ink-soft mt-0.5">{hint}</p>}
    </div>
  );
}

function Verdict({ yes, label }: { yes: boolean; label: string }) {
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={yes ? { color: "var(--kale)", background: "rgba(78,112,67,0.12)" } : { color: "var(--chili)", background: "rgba(203,58,30,0.08)" }}
    >
      {yes ? "✓" : "✗"} {label}
    </span>
  );
}

function ReviewCard({ review, purchase, onOpen }: { review: Review; purchase?: SpendingEntry; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-left bg-card border border-line rounded-2xl p-4 hover:border-ink-soft transition-colors cursor-pointer flex flex-col gap-3 min-w-0"
    >
      {review.image && (
        // Notion's links expire within the hour, so a page left open that
        // long hides the photo rather than showing a broken one; a reload
        // fetches fresh links.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={review.image.url}
          alt=""
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="-mx-4 -mt-4 w-[calc(100%+2rem)] max-w-none aspect-[16/9] object-cover rounded-t-2xl"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-lg text-ink leading-snug line-clamp-2 break-words">{review.name}</p>
          <p className="font-mono text-xs text-ink-soft mt-0.5">
            {review.type}
            {review.category && ` · ${review.category}`}
          </p>
        </div>
        {review.rating !== null ? (
          <p className="shrink-0 font-display font-bold text-2xl leading-none" style={{ color: ratingColor(review.rating) }}>
            {formatRating(review.rating)}
            <span className="font-mono text-xs font-normal text-ink-soft">/{RATING_MAX}</span>
          </p>
        ) : (
          <p className="shrink-0 font-mono text-xs text-ink-soft">not rated</p>
        )}
      </div>

      {review.rating !== null && (
        <div className="h-1.5 rounded-full bg-line overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${(review.rating / RATING_MAX) * 100}%`, background: ratingColor(review.rating) }} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Verdict yes={review.worthIt} label="Worth it" />
        <Verdict yes={review.wouldPurchaseAgain} label="Would buy again" />
      </div>

      {review.notes && <p className="text-sm text-ink-soft line-clamp-2 break-words">{review.notes}</p>}

      <div className="mt-auto flex items-center justify-between gap-3 font-mono text-xs text-ink-soft">
        <span className="text-ink">{formatPrice(review.price)}</span>
        <span className="truncate">
          {purchase ? `${purchase.store || purchase.item} · ` : ""}
          {review.date ? formatDate(review.date) : "no date"}
        </span>
      </div>
    </button>
  );
}

/** The Experience tab: things bought and done, each rated and judged on value. */
export default function ReviewsTab({ reviews, spending }: Props) {
  const [type, setType] = useState<ReviewType | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  // "new" for the add form, a review to edit, or null when closed.
  const [open, setOpen] = useState<Review | "new" | null>(null);

  if (!reviews) {
    return (
      <div className="bg-card border border-line rounded-2xl p-5 text-sm text-ink-soft">
        Not connected yet — add{" "}
        <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">NOTION_REVIEWS_ID</code> to{" "}
        <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">.env.local</code> and Vercel.
      </div>
    );
  }

  const categories = reviewCategories(reviews);
  // A category that no longer has any reviews falls back to all of them.
  const activeCategory = category !== null && categories.includes(category) ? category : null;
  const shown = filterReviews(reviews, { type, category: activeCategory });
  const summary = summarizeReviews(shown);
  const purchases = new Map(spending.map((s) => [s.id, s]));
  const categorySuggestions = [...new Set([...categories, ...spending.map((s) => s.category).filter(Boolean)])].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-bold text-2xl text-ink tracking-tight">Reviews</h2>
        <button
          onClick={() => setOpen("new")}
          className="font-mono text-xs px-3 py-1.5 rounded-full bg-ink text-paper hover:opacity-90 transition-opacity cursor-pointer"
        >
          + Add review
        </button>
      </div>

      {/* Of what's showing, so a filter answers "how are my restaurant picks doing?". */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Average rating"
          value={summary.averageRating === null ? "—" : `${formatRating(Math.round(summary.averageRating * 10) / 10)}/${RATING_MAX}`}
          hint={`${summary.count} review${summary.count === 1 ? "" : "s"}`}
        />
        <Stat label="Worth it" value={percent(summary.worthItShare)} />
        <Stat label="Would buy again" value={percent(summary.wouldPurchaseAgainShare)} />
        <Stat label="Spent, not worth it" value={formatPrice(summary.notWorthItSpend)} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setType(null)} className={chipCls(type === null)}>
          All
        </button>
        {REVIEW_TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={chipCls(type === t)}>
            {t === "Item" ? "Items" : "Experiences"}
          </button>
        ))}
        {categories.length > 0 && (
          <select
            value={activeCategory ?? ""}
            onChange={(e) => setCategory(e.target.value || null)}
            aria-label="Category"
            className="ml-auto font-mono text-xs rounded-full border border-line bg-card px-2.5 py-1 text-ink-soft focus:outline-none focus:border-ink-soft cursor-pointer"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-ink-soft italic px-1 py-6">
          {reviews.length === 0 ? "No reviews yet — add the last thing you bought or did." : "Nothing matches these filters."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <ReviewCard key={r.id} review={r} purchase={r.spendingId ? purchases.get(r.spendingId) : undefined} onOpen={() => setOpen(r)} />
          ))}
        </div>
      )}

      {open && (
        <ReviewForm
          // A fresh form each time it opens, starting from what's saved.
          key={open === "new" ? "new" : open.id}
          review={open === "new" ? undefined : open}
          spending={spending}
          categorySuggestions={categorySuggestions}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
