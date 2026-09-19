"use client";

import { useState } from "react";
import SpendingEntryForm from "./SpendingEntryForm";
import type { SpendingEntry } from "../api/spending/route";
import type { SpendingOptions } from "../lib/getSpendingOptions";

const CATEGORY_COLORS: Record<string, string> = {
  Health: "bg-red-100 text-red-700",
  Food: "bg-orange-100 text-orange-700",
  Transport: "bg-blue-100 text-blue-700",
  Entertainment: "bg-purple-100 text-purple-700",
  Shopping: "bg-pink-100 text-pink-700",
  Utilities: "bg-yellow-100 text-yellow-700",
  Other: "bg-gray-100 text-gray-700",
};

function categoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-700";
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Props = { entries: SpendingEntry[]; options: SpendingOptions; storeSuggestions: string[] };

export default function SpendingTimeline({ entries, options, storeSuggestions }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Group by date
  const grouped: Record<string, SpendingEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    return <p className="text-gray-400 text-sm">No spending entries found.</p>;
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const dayTotal = grouped[date].reduce((sum, e) => sum + e.amount, 0);
        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-500">{formatDate(date)}</span>
              <span className="text-sm font-semibold text-indigo-600">${dayTotal.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              {grouped[date].map((entry) =>
                entry.id === editingId ? (
                  <SpendingEntryForm
                    key={entry.id}
                    entry={entry}
                    options={options}
                    storeSuggestions={storeSuggestions}
                    onClose={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 truncate">{entry.item}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(entry.category)}`}
                        >
                          {entry.category}
                        </span>
                      </div>
                      {entry.notes && <p className="text-xs text-gray-400 mt-1 truncate">{entry.notes}</p>}
                      {entry.paymentMethod && (
                        <p className="text-xs text-gray-400 mt-0.5">{entry.paymentMethod}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-gray-800 font-semibold whitespace-nowrap">
                        ${entry.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setEditingId(entry.id)}
                        aria-label={`Edit ${entry.item}`}
                        className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        edit
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
