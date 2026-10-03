import type { ReactNode } from "react";
import { DISH_BORDER, type DishType } from "../lib/dietMenu";

export type DishCost = {
  /** Omitted when the batch size isn't known. */
  perServe?: string;
  batchTotal: string;
  batchLabel: string;
  items: { ingredient: string; cost: string }[];
  note: string;
};

export type DishNutritionView = { summary: string; items: { label: string; value: string }[]; note: string };

const rowCls = "flex items-center justify-between gap-2 py-2.5 list-none text-sm font-semibold text-ink select-none";

/** A Cost / Nutrition / Notes row: expandable when it has content, a plain label when it doesn't. */
function InfoRow({ label, value, last, children }: { label: string; value?: string; last?: boolean; children: ReactNode }) {
  const border = last ? "" : "border-b border-line";
  const summary = (
    <>
      {label}
      <span className="font-mono text-xs text-ink-soft">{value}</span>
    </>
  );
  if (!children) return <div className={`${rowCls} ${border} text-ink-soft`}>{summary}</div>;
  return (
    <details className={border}>
      <summary className={`${rowCls} cursor-pointer`}>{summary}</summary>
      {children}
    </details>
  );
}

export default function DishCard({
  name,
  type,
  role,
  notes,
  cost,
  nutrition,
  actions,
}: {
  name: string;
  type: DishType;
  role?: string;
  notes: string;
  cost?: DishCost;
  nutrition?: DishNutritionView;
  /** Controls for the top-right corner, e.g. edit and reorder buttons. */
  actions?: ReactNode;
}) {
  return (
    <div
      className="bg-card border border-line rounded-2xl p-4 border-l-4 h-full"
      style={{ borderLeftColor: DISH_BORDER[type] }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-semibold text-ink text-base min-h-12">{name}</span>
        {role && (
          <span className="text-xs font-mono uppercase tracking-wide text-ink-soft border border-line rounded-full px-2 py-0.5 shrink-0">
            {role}
          </span>
        )}
        {actions}
      </div>
      {/* Every card shows all three rows, blank where there's nothing yet, so the cards line up. */}
      <div className="border-t border-line">
        <InfoRow label="Cost" value={cost && (cost.perServe ? `${cost.perServe} / serve` : `${cost.batchTotal} / batch`)}>
          {cost && (
            <div className="pb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left pb-1.5 text-ink-soft font-mono uppercase tracking-wide font-normal">Ingredient</th>
                    <th className="text-right pb-1.5 text-ink-soft font-mono uppercase tracking-wide font-normal">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.items.map((row, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="py-1.5 text-ink">{row.ingredient}</td>
                      <td className="py-1.5 text-right font-mono text-ink">{row.cost}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2" style={{ borderColor: "rgba(27,51,39,0.28)" }}>
                    <td className="pt-2 font-bold text-ink font-display">{cost.batchLabel}</td>
                    <td className="pt-2 text-right font-mono font-bold text-ink">{cost.batchTotal}</td>
                  </tr>
                </tbody>
              </table>
              {cost.note && <p className="text-xs text-ink-soft mt-2 leading-relaxed">{cost.note}</p>}
            </div>
          )}
        </InfoRow>
        <InfoRow label="Nutrition" value={nutrition?.summary}>
          {nutrition && (
            <div className="pb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left pb-1.5 text-ink-soft font-mono uppercase tracking-wide font-normal">Per portion (excl. rice)</th>
                    <th className="text-right pb-1.5 text-ink-soft font-mono uppercase tracking-wide font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {nutrition.items.map((row) => (
                    <tr key={row.label} className="border-b border-line last:border-0">
                      <td className="py-1.5 text-ink">{row.label}</td>
                      <td className="py-1.5 text-right font-mono text-ink">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {nutrition.note && <p className="text-xs text-ink-soft mt-2 leading-relaxed">{nutrition.note}</p>}
            </div>
          )}
        </InfoRow>
        <InfoRow label="Notes" last>
          {notes && <p className="text-xs text-ink-soft pb-3 leading-relaxed">{notes}</p>}
        </InfoRow>
      </div>
    </div>
  );
}
