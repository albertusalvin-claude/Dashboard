"use client";

import { useState } from "react";
import DietTab from "./DietTab";
import FitnessTab from "./FitnessTab";
import type { WeightEntry } from "../lib/getWeightLog";
import type { BPEntry } from "../lib/getBPLog";

type Props = {
  weightLog: WeightEntry[];
  bpLog: BPEntry[];
};

type SubTab = "diet" | "fitness";

export default function HealthTab({ weightLog, bpLog }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("diet");

  return (
    <div>
      <div className="flex gap-2 mb-8">
        {(["diet", "fitness"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`font-mono text-sm px-4 py-2 rounded-full border capitalize transition-colors cursor-pointer
              ${subTab === t
                ? "bg-ink text-paper border-ink"
                : "text-ink-soft border-line hover:border-ink-soft hover:text-ink"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === "diet" ? (
        <DietTab />
      ) : (
        <FitnessTab weightLog={weightLog} bpLog={bpLog} />
      )}
    </div>
  );
}
