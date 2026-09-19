"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addSpendingEntry,
  deleteSpendingEntry,
  updateSpendingEntry,
  type SpendingDraft,
} from "../actions/spending";
import type { SpendingEntry } from "../api/spending/route";
import type { SpendingOptions } from "../lib/getSpendingOptions";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";

// This tab predates the paper/ink palette used elsewhere, so the form matches
// its surroundings rather than the rest of the dashboard.
const inputCls =
  "w-full rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-800 focus:outline-none focus:border-gray-400";

const today = () => new Date().toISOString().slice(0, 10);

const blankDraft = (): SpendingDraft => ({
  item: "",
  amount: NaN,
  category: "",
  date: today(),
  notes: "",
  paymentMethod: "",
  store: "",
});

const draftFrom = (entry: SpendingEntry): SpendingDraft => ({
  item: entry.item,
  amount: entry.amount,
  category: entry.category,
  date: entry.date,
  notes: entry.notes,
  paymentMethod: entry.paymentMethod,
  store: entry.store,
});

type Props = {
  /** Omitted to add a new entry; supplied to edit an existing one. */
  entry?: SpendingEntry;
  options: SpendingOptions;
  /** Store is free text in Notion, so its suggestions come from other entries. */
  storeSuggestions: string[];
  onClose: () => void;
};

export default function SpendingEntryForm({ entry, options, storeSuggestions, onClose }: Props) {
  const router = useRouter();
  const id = useId();
  const isDummy = useIsDummyRoute();
  const [draft, setDraft] = useState<SpendingDraft>(entry ? draftFrom(entry) : blankDraft());
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof SpendingDraft>(key: K, value: SpendingDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function save() {
    setError(null);
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = entry ? await updateSpendingEntry(entry.id, draft) : await addSpendingEntry(draft);
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (!entry) return;
    setError(null);
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = await deleteSpendingEntry(entry.id);
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  // Free text with suggestions, matching how the asset logs handle Selects:
  // Notion creates a new option on first use, so this is a hint, not a limit.
  const suggest = (field: "category" | "paymentMethod" | "store", list: string[]) => (
    <>
      <input
        className={inputCls}
        value={draft[field]}
        list={`${id}-${field}`}
        onChange={(e) => set(field, e.target.value)}
      />
      <datalist id={`${id}-${field}`}>
        {list.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      {error && <p className="text-xs text-red-600 break-words">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-gray-400">Item</span>
          <input className={inputCls} value={draft.item} autoFocus onChange={(e) => set("item", e.target.value)} />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Amount</span>
          <input
            className={inputCls}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={Number.isFinite(draft.amount) ? draft.amount : ""}
            onChange={(e) => set("amount", e.target.value === "" ? NaN : Number(e.target.value))}
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Category</span>
          {suggest("category", options.categories)}
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Date</span>
          <input className={inputCls} type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Payment method</span>
          {suggest("paymentMethod", options.paymentMethods)}
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Store</span>
          {suggest("store", storeSuggestions)}
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs text-gray-400">Notes</span>
          <input className={inputCls} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={isPending || !draft.item.trim()}
          className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : entry ? "Save" : "Add entry"}
        </button>
        <button
          onClick={onClose}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          Cancel
        </button>

        {entry && (
          <button
            onClick={remove}
            disabled={isPending}
            className={`ml-auto text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-40 ${
              confirmingDelete
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300"
            }`}
          >
            {confirmingDelete ? "Tap again to delete" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
