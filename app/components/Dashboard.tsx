"use client";

import { useState } from "react";
import MoneyTab from "./MoneyTab";
import HealthTab from "./HealthTab";
import type { SpendingEntry } from "../api/spending/route";
import type { ShoppingItem } from "../lib/getShoppingList";
import type { WeightEntry } from "../lib/getWeightLog";
import type { BPEntry } from "../lib/getBPLog";

type Tab = "money" | "health";

type Props = {
  entries: SpendingEntry[];
  shoppingItems: ShoppingItem[];
  monthSpend: number;
  totalSpend: number;
  topCategory: string;
  weightLog: WeightEntry[];
  bpLog: BPEntry[];
};

export default function Dashboard({
  entries,
  shoppingItems,
  monthSpend,
  totalSpend,
  topCategory,
  weightLog,
  bpLog,
}: Props) {
  const [tab, setTab] = useState<Tab>("money");

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-4 py-10">

        <header className="border-b-2 border-ink pb-8 mb-8">
          <h1
            className="font-display font-extrabold leading-none tracking-tight text-ink"
            style={{ fontSize: "clamp(40px,7vw,72px)" }}
          >
            Life Dashboard
          </h1>
        </header>

        <div className="flex gap-1 border-b border-line mb-8">
          {(["money", "health"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-display font-bold text-lg px-5 py-2.5 border-b-[3px] mb-[-1px] capitalize transition-colors cursor-pointer
                ${tab === t
                  ? "text-ink border-chili"
                  : "text-ink-soft border-transparent hover:text-ink"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "money" ? (
          <MoneyTab
            entries={entries}
            shoppingItems={shoppingItems}
            monthSpend={monthSpend}
            totalSpend={totalSpend}
            topCategory={topCategory}
          />
        ) : (
          <HealthTab weightLog={weightLog} bpLog={bpLog} />
        )}

      </div>
    </div>
  );
}
