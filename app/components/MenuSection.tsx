"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { reorderMenuItems } from "../actions/dietMenu";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";

type Item = { id: string; order: number };

const toolCls =
  "font-mono text-xs px-2 py-1 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer shrink-0";

type Props<T extends Item> = {
  items: T[];
  gridClassName: string;
  addLabel: string;
  /** A card for the item, with `actions` placed in its top-right corner. */
  renderCard: (item: T, actions: ReactNode) => ReactNode;
  /** The add form when `item` is omitted, the edit form when it's supplied. */
  renderForm: (args: { item?: T; nextOrder: number; onClose: () => void }) => ReactNode;
};

/**
 * A grid of menu cards that can be dragged into a new order, edited in place, and
 * added to. The new order is saved as each item's Order number.
 */
export default function MenuSection<T extends Item>({ items, gridClassName, addLabel, renderCard, renderForm }: Props<T>) {
  const router = useRouter();
  const isDummy = useIsDummyRoute();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const dragId = useRef<string | null>(null);

  // The order on screen, kept locally so a drag shows immediately; reset to
  // the server's order whenever fresh items arrive.
  const [ids, setIds] = useState(() => items.map((i) => i.id));
  const [syncedItems, setSyncedItems] = useState(items);
  if (items !== syncedItems) {
    setSyncedItems(items);
    setIds(items.map((i) => i.id));
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = ids.map((id) => byId.get(id)).filter((i): i is T => Boolean(i));
  const nextOrder = items.reduce((max, i) => Math.max(max, i.order + 1), items.length);

  function moved(list: string[], id: string, to: number): string[] {
    const next = list.filter((x) => x !== id);
    next.splice(to, 0, id);
    return next;
  }

  function persist(nextIds: string[]) {
    const updates = nextIds
      .map((id, order) => ({ id, order }))
      .filter(({ id, order }) => byId.get(id)?.order !== order);
    if (updates.length === 0) return;

    setError(null);
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = await reorderMenuItems(updates);
      if (!result.ok) {
        setError(result.error);
        setIds(items.map((i) => i.id));
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          className="rounded-xl border px-4 py-2.5 text-sm break-words"
          style={{ borderColor: "#CB3A1E", color: "#CB3A1E", background: "rgba(203,58,30,0.08)" }}
        >
          {error}
        </div>
      )}

      <div className={gridClassName}>
        {ordered.map((item) =>
          item.id === editingId ? (
            <div key={item.id} className="col-span-full">
              {renderForm({ item, nextOrder, onClose: () => setEditingId(null) })}
            </div>
          ) : (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                dragId.current = item.id;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", item.id);
              }}
              // Moving on enter (not over) keeps the cards from swapping back
              // and forth while the pointer rests on the one that just moved.
              onDragEnter={() => {
                const dragging = dragId.current;
                if (!dragging || dragging === item.id) return;
                setIds((current) => moved(current, dragging, current.indexOf(item.id)));
              }}
              onDragOver={(e) => {
                if (dragId.current) e.preventDefault();
              }}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={() => {
                dragId.current = null;
                persist(ids);
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              {renderCard(
                item,
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setAdding(false);
                  }}
                  className={toolCls}
                >
                  Edit
                </button>
              )}
            </div>
          )
        )}

        {adding ? (
          <div className="col-span-full">{renderForm({ nextOrder, onClose: () => setAdding(false) })}</div>
        ) : (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="min-h-24 rounded-2xl border-2 border-dashed border-line text-sm font-mono text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            + {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
