"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";

type Result = { ok: true } | { ok: false; error: string };

export const inputCls =
  "w-full rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink focus:outline-none focus:border-ink-soft";

const numberValue = (v: number | null) => (v === null ? "" : v);
const numberFrom = (raw: string) => (raw === "" ? null : Number(raw));

export function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export function NumberInput({ value, onChange, step = "any" }: { value: number | null; onChange: (v: number | null) => void; step?: string }) {
  return (
    <input
      type="number"
      step={step}
      value={numberValue(value)}
      onChange={(e) => onChange(numberFrom(e.target.value))}
      className={`${inputCls} font-mono text-right`}
    />
  );
}

export type Column<R> = { key: keyof R & string; label: string; numeric?: boolean; className?: string };

/** Rows of an ingredient-style table, each editable, with add and remove. */
export function RowsEditor<R extends Record<string, string | number | null>>({
  columns,
  rows,
  blank,
  addLabel,
  onChange,
}: {
  columns: Column<R>[];
  rows: R[];
  blank: () => R;
  addLabel: string;
  onChange: (rows: R[]) => void;
}) {
  const update = (index: number, key: keyof R, value: string | number | null) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`pb-1.5 px-1 font-mono uppercase tracking-wide text-ink-soft font-normal whitespace-nowrap ${c.numeric ? "text-right" : "text-left"}`}
                >
                  {c.label}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={`py-1 px-1 ${c.className ?? ""}`}>
                    {c.numeric ? (
                      <NumberInput value={row[c.key] as number | null} onChange={(v) => update(i, c.key, v)} />
                    ) : (
                      <input
                        value={String(row[c.key] ?? "")}
                        onChange={(e) => update(i, c.key, e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </td>
                ))}
                <td className="py-1 pl-1 w-6">
                  <button
                    aria-label="Remove row"
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    className="text-ink-soft hover:text-[#CB3A1E] px-1 cursor-pointer"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => onChange([...rows, blank()])}
        className="font-mono text-xs px-2 py-1 rounded-full border border-dashed border-line text-ink-soft hover:border-ink-soft hover:text-ink cursor-pointer"
      >
        + {addLabel}
      </button>
    </div>
  );
}

/** Save / Cancel / Delete around a menu form, with the dummy-route guard. */
export function FormShell({
  title,
  canSave,
  onSave,
  onDelete,
  onClose,
  children,
}: {
  title: string;
  canSave: boolean;
  onSave: () => Promise<Result>;
  /** Omitted when adding. */
  onDelete?: () => Promise<Result>;
  onClose: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const isDummy = useIsDummyRoute();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<Result>) {
    setError(null);
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="bg-card border border-ink-soft rounded-2xl p-5 space-y-4">
      <h3 className="font-display font-bold text-lg text-ink">{title}</h3>
      {error && <p className="text-xs break-words" style={{ color: "#CB3A1E" }}>{error}</p>}

      {children}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => run(onSave)}
          disabled={isPending || !canSave}
          className="font-mono text-xs px-3 py-1.5 rounded-full bg-ink text-paper cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onClose}
          className="font-mono text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:text-ink cursor-pointer"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={() => {
              if (!confirmingDelete) {
                setConfirmingDelete(true);
                return;
              }
              run(onDelete);
            }}
            disabled={isPending}
            className={`ml-auto font-mono text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-40 ${
              confirmingDelete
                ? "border-[#CB3A1E] text-[#CB3A1E] bg-[rgba(203,58,30,0.08)]"
                : "border-line text-ink-soft hover:border-[#CB3A1E] hover:text-[#CB3A1E]"
            }`}
          >
            {confirmingDelete ? "Tap again to delete" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
