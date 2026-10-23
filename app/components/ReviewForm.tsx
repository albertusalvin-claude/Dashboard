"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addReview, deleteReview, updateReview } from "../actions/reviews";
import type { SpendingEntry } from "../api/spending/route";
import {
  RATING_MAX,
  REVIEW_TYPES,
  blankReview,
  draftOf,
  formatPrice,
  linkSpending,
  reviewError,
  type Review,
  type PhotoChange,
  type ReviewDraft,
  type ReviewType,
} from "../lib/reviews";
import { shrinkPhoto } from "../lib/shrinkPhoto";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-ink-soft";

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-mono uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}

/** A number input that reads empty as null, rather than as 0 or NaN. */
function numberFrom(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

type Props = {
  /** Omitted to add a new review; supplied to edit one. */
  review?: Review;
  /** Newest first, to link the review to what it was bought with. */
  spending: SpendingEntry[];
  categorySuggestions: string[];
  onClose: () => void;
};

/** Adds or edits a review. Full-screen on a phone, a dialog from sm up. */
export default function ReviewForm({ review, spending, categorySuggestions, onClose }: Props) {
  const router = useRouter();
  const id = useId();
  const isDummy = useIsDummyRoute();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ReviewDraft>(review ? draftOf(review) : blankReview());
  // The photo as it'll be saved: as it is, removed, or a new one (already
  // shrunk, with a preview link for it).
  const [photo, setPhoto] = useState<{ kind: "keep" } | { kind: "remove" } | { kind: "replace"; file: File; preview: string }>({
    kind: "keep",
  });
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const shownPhoto = photo.kind === "replace" ? photo.preview : photo.kind === "keep" ? review?.image?.url : undefined;

  // A new photo's preview link holds it in memory until it's let go.
  useEffect(() => {
    if (photo.kind !== "replace") return;
    return () => URL.revokeObjectURL(photo.preview);
  }, [photo]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparingPhoto(true);
    try {
      const shrunk = await shrinkPhoto(file);
      setPhoto({ kind: "replace", file: shrunk, preview: URL.createObjectURL(shrunk) });
    } catch {
      setError("Couldn't read that photo — try a JPEG or PNG.");
    } finally {
      setPreparingPhoto(false);
    }
  }
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const set = <K extends keyof ReviewDraft>(key: K, value: ReviewDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // Escape closes it, like clicking outside does.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  function save() {
    const problem = reviewError(draft);
    if (problem) {
      setError(problem);
      return;
    }
    const change = photoChange();
    run(() => (review ? updateReview(review.id, draft, change) : addReview(draft, change)));
  }

  // A new photo travels as FormData, the one way a Server Action takes a file.
  function photoChange(): PhotoChange {
    if (photo.kind !== "replace") return photo;
    const form = new FormData();
    form.append("photo", photo.file);
    return { kind: "replace", photo: form };
  }

  function remove() {
    if (!review) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    run(() => deleteReview(review.id));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-ink/30 sm:p-6"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="w-full sm:max-w-lg max-h-full overflow-y-auto bg-paper sm:bg-card sm:border sm:border-line sm:rounded-2xl p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-title`} className="font-display font-bold text-xl text-ink">
            {review ? "Edit review" : "New review"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="font-mono text-xl leading-none text-ink-soft hover:text-ink cursor-pointer">
            ×
          </button>
        </div>

        <Field label="Bought with (optional)" htmlFor={`${id}-spending`}>
          <select
            id={`${id}-spending`}
            value={draft.spendingId ?? ""}
            onChange={(e) => setDraft((d) => linkSpending(d, spending.find((s) => s.id === e.target.value)))}
            className={inputCls}
          >
            <option value="">Not linked to a Spending entry</option>
            {/* Keeps a link to an entry that's since gone from Spending. */}
            {draft.spendingId && !spending.some((s) => s.id === draft.spendingId) && (
              <option value={draft.spendingId}>(an entry no longer in Spending)</option>
            )}
            {spending.map((s) => (
              <option key={s.id} value={s.id}>
                {s.item} · {formatPrice(s.amount)} · {s.date}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-soft">Picking one fills in the name, price, date and category you haven&apos;t typed.</p>
        </Field>

        <Field label="Name" htmlFor={`${id}-name`}>
          <input
            id={`${id}-name`}
            value={draft.name}
            autoFocus={!review}
            onChange={(e) => set("name", e.target.value)}
            placeholder="What was it?"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <div className="flex gap-1.5">
              {REVIEW_TYPES.map((t: ReviewType) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  aria-pressed={draft.type === t}
                  className={`flex-1 font-mono text-xs px-2 py-1.5 rounded-full border transition-colors cursor-pointer ${
                    draft.type === t ? "bg-ink text-paper border-ink" : "border-line text-ink-soft hover:border-ink-soft hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Category" htmlFor={`${id}-category`}>
            <input
              id={`${id}-category`}
              list={`${id}-categories`}
              value={draft.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="e.g. Tech"
              className={inputCls}
            />
            <datalist id={`${id}-categories`}>
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        {/* On a phone the date gets its own row; a date picker is too wide to share. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <Field label={`Rating /${RATING_MAX}`} htmlFor={`${id}-rating`}>
            <input
              id={`${id}-rating`}
              type="number"
              inputMode="decimal"
              min={0}
              max={RATING_MAX}
              step={0.5}
              value={draft.rating ?? ""}
              onChange={(e) => set("rating", numberFrom(e.target.value))}
              placeholder="0–10"
              className={inputCls}
            />
          </Field>
          <Field label="Price (AUD)" htmlFor={`${id}-price`}>
            <input
              id={`${id}-price`}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={draft.price ?? ""}
              onChange={(e) => set("price", numberFrom(e.target.value))}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
          <Field label="Date" htmlFor={`${id}-date`}>
            <input
              id={`${id}-date`}
              type="date"
              value={draft.date ?? ""}
              onChange={(e) => set("date", e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={draft.worthIt} onChange={(e) => set("worthIt", e.target.checked)} className="w-4 h-4 accent-[#4E7043]" />
            Worth it
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={draft.wouldPurchaseAgain}
              onChange={(e) => set("wouldPurchaseAgain", e.target.checked)}
              className="w-4 h-4 accent-[#4E7043]"
            />
            Would purchase again
          </label>
        </div>

        <Field label="Photo" htmlFor={`${id}-photo`}>
          {shownPhoto && (
            // A plain <img>: Notion's links expire within the hour, so
            // there's nothing for Next's image optimiser to cache.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownPhoto} alt="" className="w-full max-h-56 object-cover rounded-lg border border-line" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={`${id}-photo`}
              className="font-mono text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink cursor-pointer"
            >
              {preparingPhoto ? "Preparing…" : shownPhoto ? "Change photo" : "+ Add photo"}
            </label>
            {/* accept="image/*" lets a phone offer its camera as well as its library. */}
            <input
              id={`${id}-photo`}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                pickPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {shownPhoto && (
              <button
                type="button"
                onClick={() => setPhoto({ kind: review?.image ? "remove" : "keep" })}
                className="font-mono text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-chili hover:text-chili cursor-pointer"
              >
                Remove
              </button>
            )}
            {photo.kind === "remove" && (
              <button type="button" onClick={() => setPhoto({ kind: "keep" })} className="font-mono text-xs text-ink-soft underline cursor-pointer">
                Undo
              </button>
            )}
          </div>
        </Field>

        <Field label="Notes" htmlFor={`${id}-notes`}>
          <textarea
            id={`${id}-notes`}
            rows={4}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="What was good, what wasn't…"
            className={`${inputCls} leading-relaxed`}
          />
        </Field>

        {error && <p className="text-xs break-words text-chili">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={save}
            disabled={isPending || preparingPhoto || !draft.name.trim()}
            className="font-mono text-xs px-3 py-1.5 rounded-full bg-ink text-paper cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Saving…" : review ? "Save" : "Add review"}
          </button>
          <button onClick={onClose} className="font-mono text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:text-ink cursor-pointer">
            Cancel
          </button>
          {review && (
            <button
              onClick={remove}
              disabled={isPending}
              className={`ml-auto font-mono text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-40 ${
                confirmingDelete
                  ? "border-chili text-chili bg-[rgba(203,58,30,0.08)]"
                  : "border-line text-ink-soft hover:border-chili hover:text-chili"
              }`}
            >
              {confirmingDelete ? "Tap again to delete" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
