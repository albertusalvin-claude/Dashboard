"use client";

import { useState } from "react";
import type { SpendingEntry } from "../api/spending/route";
import {
  RATING_MAX,
  NO_FILTER,
  REVIEW_SORTS,
  REVIEW_TYPES,
  filterReviews,
  formatPrice,
  formatRating,
  isFiltering,
  reviewCategories,
  type Review,
  type ReviewFilter,
  type ReviewSort,
} from "../lib/reviews";
import ReviewForm from "./ReviewForm";

type Props = {
  /** Null when the Notion database isn't configured. */
  reviews: Review[] | null;
  /** The Tags column's options: every tag, used or not. */
  tagOptions: string[];
  /** Newest first, to link reviews to purchases. */
  spending: SpendingEntry[];
};

const selectCls =
  "font-mono text-xs rounded-full border border-line bg-card px-2.5 py-1 text-ink-soft focus:outline-none focus:border-ink-soft cursor-pointer";

// A yes/no filter's <select> value: "" for either.
const yesNo = (value: boolean | null) => (value === null ? "" : value ? "yes" : "no");
const fromYesNo = (value: string) => (value === "" ? null : value === "yes");

const chipCls = (active: boolean) =>
  `font-mono text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
    active ? "bg-ink text-paper border-ink" : "border-line text-ink-soft hover:border-ink-soft hover:text-ink"
  }`;

// Green for a good score, gold for middling, chili for poor.
const ratingColor = (rating: number) => (rating >= 8 ? "var(--kale)" : rating >= 5 ? "var(--gold)" : "var(--chili)");

/** "12 Oct 2026" from YYYY-MM-DD, read as a calendar date. */
function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
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
        // A landscape crop so every card lines up; the edit form shows the
        // whole photo. Notion's links expire within the hour, so a page left
        // open that long hides the photo rather than showing a broken one; a
        // reload fetches fresh links.
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

      {review.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {review.tags.map((tag) => (
            <span key={tag} className="font-mono text-[11px] px-2 py-0.5 rounded-full text-blueberry bg-[rgba(64,58,122,0.1)]">
              {tag}
            </span>
          ))}
        </div>
      )}

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
export default function ReviewsTab({ reviews, tagOptions, spending }: Props) {
  const [filter, setFilter] = useState<ReviewFilter>(NO_FILTER);
  const update = (change: Partial<ReviewFilter>) => setFilter((f) => ({ ...f, ...change }));
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
  // Every tag: the column's options, plus any on a review that isn't one yet.
  const allTags = [...new Set([...tagOptions, ...reviews.flatMap((r) => r.tags)])];
  const purchases = new Map(spending.map((s) => [s.id, s]));
  // A category or tag that no longer exists is dropped from the filter.
  const active = {
    ...filter,
    category: filter.category !== null && categories.includes(filter.category) ? filter.category : null,
    tags: filter.tags.filter((t) => allTags.includes(t)),
  };
  // The store it was bought from is searchable too, when it's linked.
  const shown = filterReviews(reviews, active, (r) => {
    const purchase = r.spendingId ? purchases.get(r.spendingId) : undefined;
    return purchase ? `${purchase.store} ${purchase.item}` : "";
  });
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

      <div className="space-y-2">
        <input
          type="search"
          value={filter.query}
          onChange={(e) => update({ query: e.target.value })}
          placeholder="Search names, notes, categories, stores…"
          aria-label="Search reviews"
          className="w-full rounded-full border border-line bg-card px-4 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-ink-soft"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => update({ type: null })} className={chipCls(active.type === null)}>
            All
          </button>
          {REVIEW_TYPES.map((t) => (
            <button key={t} onClick={() => update({ type: t })} className={chipCls(active.type === t)}>
              {t === "Item" ? "Items" : "Experiences"}
            </button>
          ))}
          {categories.length > 0 && (
            <select value={active.category ?? ""} onChange={(e) => update({ category: e.target.value || null })} aria-label="Category" className={selectCls}>
              <option value="">Any category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <select value={yesNo(active.worthIt)} onChange={(e) => update({ worthIt: fromYesNo(e.target.value) })} aria-label="Worth it" className={selectCls}>
            <option value="">Worth it: any</option>
            <option value="yes">Worth it</option>
            <option value="no">Not worth it</option>
          </select>
          <select
            value={yesNo(active.wouldPurchaseAgain)}
            onChange={(e) => update({ wouldPurchaseAgain: fromYesNo(e.target.value) })}
            aria-label="Would buy again"
            className={selectCls}
          >
            <option value="">Buy again: any</option>
            <option value="yes">Would buy again</option>
            <option value="no">Wouldn&apos;t buy again</option>
          </select>
          {allTags.length > 0 && (
            // Picking adds a tag; several narrow to reviews that have all of them.
            <select
              value=""
              onChange={(e) => e.target.value && update({ tags: [...active.tags, e.target.value] })}
              aria-label="Tag"
              className={selectCls}
            >
              <option value="">{active.tags.length ? "Add tag…" : "Tag: any"}</option>
              {allTags
                .filter((t) => !active.tags.includes(t))
                .map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
            </select>
          )}
          {active.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 font-mono text-xs pl-2.5 pr-1 py-1 rounded-full bg-blueberry text-paper">
              {tag}
              <button
                onClick={() => update({ tags: active.tags.filter((t) => t !== tag) })}
                aria-label={`Stop filtering by ${tag}`}
                className="px-1 opacity-70 hover:opacity-100 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
          <select value={active.sort} onChange={(e) => update({ sort: e.target.value as ReviewSort })} aria-label="Sort" className={`${selectCls} sm:ml-auto`}>
            {REVIEW_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {sort}
              </option>
            ))}
          </select>
        </div>
        {reviews.length > 0 && (
          <p className="font-mono text-xs text-ink-soft px-1">
            {isFiltering(active) ? `${shown.length} of ${reviews.length}` : `${reviews.length}`} review{reviews.length === 1 ? "" : "s"}
            {isFiltering(active) && (
              <button onClick={() => setFilter({ ...NO_FILTER, sort: filter.sort })} className="ml-2 underline hover:text-ink cursor-pointer">
                Clear
              </button>
            )}
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-ink-soft italic px-1 py-6">
          {reviews.length === 0 ? "No reviews yet — add the last thing you bought or did." : "Nothing matches these filters."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
          tagOptions={allTags}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
