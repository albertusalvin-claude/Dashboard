"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addShoppingItem,
  deleteShoppingItem,
  updateShoppingItem,
  type ShoppingDraft,
} from "../actions/shopping";
import type { ShoppingItem } from "../lib/getShoppingList";
import type { ShoppingOptions } from "../lib/getShoppingOptions";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";

const inputCls =
  "w-full rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-800 focus:outline-none focus:border-gray-400";

const blankDraft = (statuses: string[]): ShoppingDraft => ({
  item: "",
  category: "",
  estPrice: null,
  link: "",
  notes: "",
  priority: "",
  // A new item is something you're considering, so it starts at the first
  // status the database defines (Watching) rather than blank.
  status: statuses[0] ?? "",
});

const draftFrom = (item: ShoppingItem): ShoppingDraft => ({
  item: item.item,
  category: item.category,
  estPrice: item.estPrice,
  link: item.link,
  notes: item.notes,
  priority: item.priority,
  status: item.status,
});

type Props = {
  /** Omitted to add a new item; supplied to edit an existing one. */
  item?: ShoppingItem;
  options: ShoppingOptions;
  onClose: () => void;
};

export default function ShoppingItemForm({ item, options, onClose }: Props) {
  const router = useRouter();
  const id = useId();
  const isDummy = useIsDummyRoute();
  const [draft, setDraft] = useState<ShoppingDraft>(item ? draftFrom(item) : blankDraft(options.statuses));
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof ShoppingDraft>(key: K, value: ShoppingDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function save() {
    setError(null);
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = item ? await updateShoppingItem(item.id, draft) : await addShoppingItem(draft);
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (!item) return;
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
      const result = await deleteShoppingItem(item.id);
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const suggest = (field: "category" | "priority" | "status", list: string[]) => (
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
    <div className="rounded-xl border border-gray-200 p-3 space-y-3">
      {error && <p className="text-xs text-red-600 break-words">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs text-gray-400">Item</span>
          <input className={inputCls} value={draft.item} autoFocus onChange={(e) => set("item", e.target.value)} />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Category</span>
          {suggest("category", options.categories)}
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Est. price (AUD)</span>
          <input
            className={inputCls}
            type="number"
            step="0.01"
            placeholder="optional"
            value={draft.estPrice ?? ""}
            onChange={(e) => set("estPrice", e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Priority</span>
          {suggest("priority", options.priorities)}
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Status</span>
          {suggest("status", options.statuses)}
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs text-gray-400">Link</span>
          <input
            className={inputCls}
            type="url"
            placeholder="https://"
            value={draft.link}
            onChange={(e) => set("link", e.target.value)}
          />
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
          {isPending ? "Saving…" : item ? "Save" : "Add item"}
        </button>
        <button
          onClick={onClose}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          Cancel
        </button>

        {item && (
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
