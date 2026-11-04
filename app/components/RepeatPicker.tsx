"use client";

import { WEEKDAYS, type Repeat } from "../lib/recurrence";

const inputCls =
  "rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink focus:outline-none focus:border-ink-soft";

type Mode = "none" | Repeat["kind"];

const MODES: { mode: Mode; label: string }[] = [
  { mode: "none", label: "Doesn't repeat" },
  { mode: "weekdays", label: "Day of the week" },
  { mode: "monthDay", label: "Day of the month" },
];

// Switching kind starts from a simple version of it.
function startOf(mode: Mode): Repeat | null {
  if (mode === "weekdays") return { kind: "weekdays", days: [1] };
  if (mode === "monthDay") return { kind: "monthDay", day: 1 };
  return null;
}

// A typed number, kept within bounds; blank or junk falls back to the minimum.
const clamp = (value: string, min: number, max: number) => Math.min(max, Math.max(min, Math.floor(Number(value)) || min));

/** How often a task comes back after it's done. */
export default function RepeatPicker({ value, onChange }: { value: Repeat | null; onChange: (repeat: Repeat | null) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select value={value?.kind ?? "none"} onChange={(e) => onChange(startOf(e.target.value as Mode))} className={inputCls}>
        {MODES.map(({ mode, label }) => (
          <option key={mode} value={mode}>
            {label}
          </option>
        ))}
      </select>

      {value?.kind === "weekdays" && (
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS.map((name, day) => {
            const on = value.days.includes(day);
            const toggle = () => {
              const [first, ...rest] = on ? value.days.filter((d) => d !== day) : [...value.days, day].sort();
              // Unticking the last day does nothing: at least one stays picked.
              if (first !== undefined) onChange({ ...value, days: [first, ...rest] });
            };
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={toggle}
                className={`font-mono text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
                  on ? "bg-ink text-paper border-ink" : "border-line text-ink-soft hover:border-ink-soft hover:text-ink"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {value?.kind === "monthDay" && (
        <label className="flex items-center gap-1.5 text-sm text-ink-soft">
          day
          <input
            type="number"
            min={1}
            max={31}
            value={value.day}
            onChange={(e) => onChange({ ...value, day: clamp(e.target.value, 1, 31) })}
            className={`${inputCls} w-16`}
          />
        </label>
      )}
    </div>
  );
}
