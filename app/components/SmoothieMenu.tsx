"use client";

import { useState, type ReactNode } from "react";
import { addSmoothie, deleteMenuItem, updateSmoothie } from "../actions/dietMenu";
import { money, smoothieTotals, type Smoothie, type SmoothieDraft, type SmoothieIngredient } from "../lib/dietMenu";
import MenuSection from "./MenuSection";
import { Field, FormShell, RowsEditor, inputCls, type Column } from "./MenuFormParts";

const thCls = "pb-1.5 font-mono uppercase tracking-wide text-ink-soft font-normal";
const totalRowStyle = { borderColor: "rgba(27,51,39,0.28)" };
const show = (v: number | null) => (v === null ? "—" : v);

function SmoothieCard({ smoothie, actions }: { smoothie: Smoothie; actions: ReactNode }) {
  const { ingredients } = smoothie;
  const totals = smoothieTotals(ingredients);
  const costed = ingredients.filter((i) => i.cost !== null);
  // Water and the like carry a cost but no nutrition worth a row.
  const nutritional = ingredients.filter((i) => [i.kcal, i.protein, i.fat, i.carbs, i.fiber].some((v) => v));

  return (
    <div className="bg-card border border-line rounded-2xl p-6 space-y-3 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-xl text-ink">{smoothie.name}</h3>
          {/* Two lines reserved, so cards with and without a description line up. */}
          <p className="text-sm text-ink-soft mt-1 min-h-10">{smoothie.description}</p>
        </div>
        {actions}
      </div>
      <div className="flex flex-wrap gap-2 text-sm text-ink-soft font-mono">
        <strong className="text-ink font-display text-2xl mr-1">{totals.kcal} kcal</strong>
        <span>
          {totals.protein} g protein · {totals.fat} g fat · {totals.carbs} g carbs · {totals.fiber} g fiber
        </span>
      </div>

      <div className="border-t border-line">
        {costed.length > 0 ? (
          <details>
            <summary className="flex items-center justify-between gap-2 py-3 cursor-pointer list-none font-semibold text-sm text-ink select-none">
              Cost breakdown
              <span className="font-mono text-xs text-ink-soft">≈ {money(totals.cost)} / serve</span>
            </summary>
            <div className="pb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line">
                    <th className={`text-left ${thCls}`}>Ingredient</th>
                    <th className={`text-center ${thCls}`}>Per serve</th>
                    <th className={`text-right ${thCls}`}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {costed.map((i, n) => (
                    <tr key={n} className="border-b border-line last:border-0">
                      <td className="py-1.5 text-ink">{i.name}</td>
                      <td className="py-1.5 text-center text-ink-soft">{i.perServe}</td>
                      <td className="py-1.5 text-right font-mono text-ink">{money(i.cost ?? 0)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2" style={totalRowStyle}>
                    <td className="pt-2 font-bold font-display text-ink">Total</td>
                    <td />
                    <td className="pt-2 text-right font-mono font-bold text-ink">{money(totals.cost)}</td>
                  </tr>
                </tbody>
              </table>
              {smoothie.costNote && <p className="text-xs text-ink-soft mt-2 leading-relaxed">{smoothie.costNote}</p>}
            </div>
          </details>
        ) : (
          <div className="py-3 font-semibold text-sm text-ink-soft">Cost breakdown</div>
        )}
      </div>

      <div className="border-t border-line">
        {nutritional.length > 0 ? (
          <details>
            <summary className="flex items-center justify-between gap-2 py-3 cursor-pointer list-none font-semibold text-sm text-ink select-none">
              Nutrition breakdown
              <span className="font-mono text-xs text-ink-soft">
                {totals.kcal} kcal · {Math.round(totals.protein)} g protein
              </span>
            </summary>
            <div className="pb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line">
                    {["Ingredient", "kcal", "Protein", "Fat", "Carb", "Fiber"].map((h, i) => (
                      <th key={h} className={`${thCls} ${i === 0 ? "text-left" : "text-right"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nutritional.map((i, n) => (
                    <tr key={n} className="border-b border-line last:border-0">
                      <td className="py-1.5 text-ink">
                        {i.name}
                        {i.perServe && <span className="text-ink-soft"> ({i.perServe})</span>}
                      </td>
                      {[i.kcal, i.protein, i.fat, i.carbs, i.fiber].map((v, k) => (
                        <td key={k} className="py-1.5 text-right font-mono text-ink">
                          {show(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2" style={totalRowStyle}>
                    <td className="pt-2 font-bold font-display text-ink">Total</td>
                    {[totals.kcal, totals.protein, totals.fat, totals.carbs, totals.fiber].map((v, k) => (
                      <td key={k} className="pt-2 text-right font-mono font-bold text-ink">
                        {v}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {smoothie.nutritionNote && (
                <p className="text-xs text-ink-soft mt-2 leading-relaxed">{smoothie.nutritionNote}</p>
              )}
            </div>
          </details>
        ) : (
          <div className="py-3 font-semibold text-sm text-ink-soft">Nutrition breakdown</div>
        )}
      </div>
    </div>
  );
}

const INGREDIENT_COLUMNS: Column<SmoothieIngredient>[] = [
  { key: "name", label: "Ingredient", className: "min-w-36" },
  { key: "perServe", label: "Per serve", className: "min-w-28" },
  { key: "cost", label: "Cost $", numeric: true, className: "min-w-20" },
  { key: "kcal", label: "kcal", numeric: true, className: "min-w-16" },
  { key: "protein", label: "Protein g", numeric: true, className: "min-w-16" },
  { key: "fat", label: "Fat g", numeric: true, className: "min-w-16" },
  { key: "carbs", label: "Carb g", numeric: true, className: "min-w-16" },
  { key: "fiber", label: "Fiber g", numeric: true, className: "min-w-16" },
];

const blankIngredient = (): SmoothieIngredient => ({
  name: "",
  perServe: "",
  cost: null,
  kcal: null,
  protein: null,
  fat: null,
  carbs: null,
  fiber: null,
});

function SmoothieForm({ smoothie, nextOrder, onClose }: { smoothie?: Smoothie; nextOrder: number; onClose: () => void }) {
  const [draft, setDraft] = useState<SmoothieDraft>(
    smoothie ?? { name: "", order: nextOrder, description: "", ingredients: [blankIngredient()], costNote: "", nutritionNote: "" }
  );
  const set = <K extends keyof SmoothieDraft>(key: K, value: SmoothieDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <FormShell
      title={smoothie ? `Edit ${smoothie.name}` : "New smoothie"}
      canSave={Boolean(draft.name.trim())}
      onSave={() => (smoothie ? updateSmoothie(smoothie.id, draft) : addSmoothie(draft))}
      onDelete={smoothie ? () => deleteMenuItem(smoothie.id) : undefined}
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input className={inputCls} value={draft.name} autoFocus onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Description">
          <input className={inputCls} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>

      <div>
        <p className="text-xs text-ink-soft mb-1">Ingredients (per serve) — totals are added up for you</p>
        <RowsEditor
          columns={INGREDIENT_COLUMNS}
          rows={draft.ingredients}
          blank={blankIngredient}
          addLabel="Ingredient"
          onChange={(rows) => set("ingredients", rows)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cost note">
          <textarea rows={2} className={inputCls} value={draft.costNote} onChange={(e) => set("costNote", e.target.value)} />
        </Field>
        <Field label="Nutrition note">
          <textarea
            rows={2}
            className={inputCls}
            value={draft.nutritionNote}
            onChange={(e) => set("nutritionNote", e.target.value)}
          />
        </Field>
      </div>
    </FormShell>
  );
}

export default function SmoothieMenu({ smoothies }: { smoothies: Smoothie[] }) {
  return (
    <MenuSection
      items={smoothies}
      gridClassName="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3"
      addLabel="Add smoothie"
      renderCard={(smoothie, actions) => <SmoothieCard smoothie={smoothie} actions={actions} />}
      renderForm={({ item, nextOrder, onClose }) => <SmoothieForm smoothie={item} nextOrder={nextOrder} onClose={onClose} />}
    />
  );
}
