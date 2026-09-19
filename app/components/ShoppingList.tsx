"use client";

import { useOptimistic, useTransition } from "react";
import { updateShoppingStatus } from "../actions/shopping";
import { useIsDummyRoute } from "../lib/useIsDummyRoute";
import type { ShoppingItem } from "../lib/getShoppingList";

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-gray-100 text-gray-500",
};

const STATUS_COLORS: Record<string, string> = {
  Watching: "bg-blue-100 text-blue-700",
  "Ready to Buy": "bg-green-100 text-green-700",
};

export default function ShoppingList({ items }: { items: ShoppingItem[] }) {
  const remaining = items.filter(
    (i) => i.status === "Watching" || i.status === "Ready to Buy"
  );

  const [optimisticItems, removeOptimistic] = useOptimistic(
    remaining,
    (state, id: string) => state.filter((i) => i.id !== id)
  );

  const [, startTransition] = useTransition();
  const isDummy = useIsDummyRoute();

  function handleAction(id: string, status: "Purchased" | "Skipped") {
    startTransition(async () => {
      removeOptimistic(id);
      if (isDummy) return;
      await updateShoppingStatus(id, status);
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col h-full">
      <h2 className="text-base font-semibold text-gray-700 mb-4">
        Shopping List{" "}
        <span className="text-xs font-normal text-gray-400">
          ({optimisticItems.length} remaining)
        </span>
      </h2>

      {optimisticItems.length === 0 ? (
        <p className="text-sm text-gray-400 my-auto text-center py-8">
          All done!
        </p>
      ) : (
        <ul className="space-y-2 overflow-y-auto flex-1">
          {optimisticItems.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:underline truncate"
                    >
                      {item.item}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {item.item}
                    </span>
                  )}
                  {item.status && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.status}
                    </span>
                  )}
                  {item.priority && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        PRIORITY_COLORS[item.priority] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.priority}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.category && (
                    <span className="text-xs text-gray-400">{item.category}</span>
                  )}
                  {item.estPrice != null && (
                    <span className="text-xs text-gray-500 font-medium">
                      ~${item.estPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => handleAction(item.id, "Purchased")}
                  title="Mark as Purchased"
                  className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                >
                  Bought
                </button>
                <button
                  onClick={() => handleAction(item.id, "Skipped")}
                  title="Skip this item"
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  Skip
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
