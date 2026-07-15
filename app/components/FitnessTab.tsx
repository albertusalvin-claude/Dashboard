import WeightSection from "./WeightSection";
import BPSection from "./BPSection";
import type { WeightEntry } from "../lib/getWeightLog";
import type { BPEntry } from "../lib/getBPLog";

type Props = {
  weightLog: WeightEntry[];
  bpLog: BPEntry[];
};

function EmptySetup({ title, envVar, schema }: { title: string; envVar: string; schema: string[] }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-8 text-center">
      <p className="text-ink font-semibold mb-1">{title} not connected yet.</p>
      <p className="text-ink-soft text-sm mb-3">
        Add <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">{envVar}</code> to your <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">.env.local</code>.
      </p>
      <div className="text-left inline-block bg-paper border border-line rounded-xl p-4 text-xs font-mono text-ink-soft mt-1">
        <p className="font-bold text-ink mb-2">Notion database schema:</p>
        {schema.map((row) => (
          <p key={row}>{row}</p>
        ))}
      </div>
    </div>
  );
}

export default function FitnessTab({ weightLog, bpLog }: Props) {
  return (
    <div className="space-y-14">

      <section>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-mono text-sm font-bold text-chili shrink-0">01</span>
          <div>
            <h2 className="font-display font-bold text-3xl text-ink tracking-tight">Weight</h2>
            <p className="text-sm text-ink-soft mt-1">
              Goal: 59.1 → 63.1 kg by mid-December 2026. ~180 g/week — slow on purpose, so the gain is lean.
            </p>
          </div>
        </div>
        {weightLog.length === 0 ? (
          <EmptySetup
            title="Weight log"
            envVar="NOTION_WEIGHT_LOG_ID"
            schema={["Date      → Date", "Weight    → Number (kg)"]}
          />
        ) : (
          <WeightSection entries={weightLog} />
        )}
      </section>

      <section>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-mono text-sm font-bold text-chili shrink-0">02</span>
          <div>
            <h2 className="font-display font-bold text-3xl text-ink tracking-tight">
              Blood pressure & resting HR
            </h2>
            <p className="text-sm text-ink-soft mt-1">
              Sit quietly 5 minutes first — feet flat, back supported, arm at heart level, no talking.
              The trend is what counts.
            </p>
          </div>
        </div>
        {bpLog.length === 0 ? (
          <EmptySetup
            title="Blood pressure log"
            envVar="NOTION_BP_LOG_ID"
            schema={["Date       → Date", "Systolic   → Number (mmHg)", "Diastolic  → Number (mmHg)", "Heart Rate → Number (bpm, optional)"]}
          />
        ) : (
          <BPSection entries={bpLog} />
        )}
      </section>

    </div>
  );
}
