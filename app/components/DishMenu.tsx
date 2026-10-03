"use client";

import { useState } from "react";
import { addDish, deleteMenuItem, updateDish } from "../actions/dietMenu";
import {
  DISH_BORDER,
  DISH_TYPES,
  DISH_TYPE_LABEL,
  batchCost,
  hasNutrition,
  money,
  type CostLine,
  type DishNutrition,
  type Dish,
  type DishDraft,
  type DishMenuKind,
} from "../lib/dietMenu";
import DishCard, { type DishCost, type DishNutritionView } from "./DishCard";
import MenuSection from "./MenuSection";
import { Field, FormShell, NumberInput, RowsEditor, inputCls, type Column } from "./MenuFormParts";

function costView(dish: Dish): DishCost | undefined {
  if (dish.costItems.length === 0) return undefined;
  const { total, perServe } = batchCost(dish);
  return {
    perServe: perServe === null ? undefined : money(perServe),
    batchTotal: money(total),
    batchLabel: dish.portions ? `Batch of ${dish.portions}` : "Batch",
    items: dish.costItems.map((c) => ({ ingredient: c.ingredient, cost: c.cost === null ? "—" : money(c.cost) })),
    note: dish.costNote,
  };
}

const NUTRITION_FIELDS: { key: keyof DishNutrition; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
];

function nutritionView(dish: Dish): DishNutritionView | undefined {
  const n = dish.nutrition;
  if (!hasNutrition(n)) return undefined;
  const summary = [n.calories !== null && `${n.calories} kcal`, n.protein !== null && `${n.protein} g protein`]
    .filter(Boolean)
    .join(" · ");
  return {
    summary,
    items: NUTRITION_FIELDS.filter((f) => n[f.key] !== null).map((f) => ({ label: f.label, value: `${n[f.key]} ${f.unit}` })),
    note: dish.nutritionNote,
  };
}

const COST_COLUMNS: Column<CostLine>[] = [
  { key: "ingredient", label: "Ingredient", className: "min-w-40" },
  { key: "cost", label: "Cost $", numeric: true, className: "w-28" },
];

const blankCostLine = (): CostLine => ({ ingredient: "", cost: null });

// A batch is usually 5 portions; a one-off dish is cooked to eat, so 1.
const blankDraft = (kind: DishMenuKind, order: number): DishDraft => ({
  name: "",
  order,
  type: "veg",
  notes: "",
  portions: kind === "mealPrep" ? 5 : 1,
  costItems: [],
  costNote: "",
  nutrition: { calories: null, protein: null, fat: null, carbs: null, fiber: null },
  nutritionNote: "",
});

function DishForm({
  kind,
  dish,
  nextOrder,
  onClose,
}: {
  kind: DishMenuKind;
  dish?: Dish;
  nextOrder: number;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DishDraft>(dish ?? blankDraft(kind, nextOrder));
  const set = <K extends keyof DishDraft>(key: K, value: DishDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const { total, perServe } = batchCost(draft);

  return (
    <FormShell
      title={dish ? `Edit ${dish.name}` : "New dish"}
      canSave={Boolean(draft.name.trim())}
      onSave={() => (dish ? updateDish(dish.id, draft) : addDish(kind, draft))}
      onDelete={dish ? () => deleteMenuItem(dish.id) : undefined}
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Name" className="sm:col-span-2">
          <input className={inputCls} value={draft.name} autoFocus onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Type">
          <select
            className={inputCls}
            value={draft.type}
            onChange={(e) => set("type", e.target.value as DishDraft["type"])}
            style={{ borderLeft: `4px solid ${DISH_BORDER[draft.type]}` }}
          >
            {DISH_TYPES.map((t) => (
              <option key={t} value={t}>
                {DISH_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Portions per batch">
          <NumberInput value={draft.portions} step="1" onChange={(v) => set("portions", v)} />
        </Field>
        <Field label="Notes" className="sm:col-span-4">
          <textarea rows={3} className={inputCls} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>

      <div>
        <p className="text-xs text-ink-soft mb-1">
          Cost (whole batch) — {money(total)}
          {perServe !== null && ` · ${money(perServe)} / serve`}
        </p>
        <RowsEditor
          columns={COST_COLUMNS}
          rows={draft.costItems}
          blank={blankCostLine}
          addLabel="Ingredient"
          onChange={(rows) => set("costItems", rows)}
        />
        <Field label="Cost note" className="mt-2">
          <input className={inputCls} value={draft.costNote} onChange={(e) => set("costNote", e.target.value)} />
        </Field>
      </div>

      <div>
        <p className="text-xs text-ink-soft mb-1">Nutrition per portion, excluding rice</p>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          {NUTRITION_FIELDS.map((f) => (
            <Field key={f.key} label={`${f.label} (${f.unit})`}>
              <NumberInput
                value={draft.nutrition[f.key]}
                onChange={(v) => set("nutrition", { ...draft.nutrition, [f.key]: v })}
              />
            </Field>
          ))}
        </div>
        <Field label="Nutrition note" className="mt-2">
          <input className={inputCls} value={draft.nutritionNote} onChange={(e) => set("nutritionNote", e.target.value)} />
        </Field>
      </div>
    </FormShell>
  );
}

export default function DishMenu({ kind, dishes, gridClassName }: { kind: DishMenuKind; dishes: Dish[]; gridClassName: string }) {
  return (
    <MenuSection
      items={dishes}
      gridClassName={gridClassName}
      addLabel="Add dish"
      renderCard={(dish, actions) => (
        <DishCard
          name={dish.name}
          type={dish.type}
          notes={dish.notes}
          cost={costView(dish)}
          nutrition={nutritionView(dish)}
          actions={actions}
        />
      )}
      renderForm={({ item, nextOrder, onClose }) => <DishForm kind={kind} dish={item} nextOrder={nextOrder} onClose={onClose} />}
    />
  );
}
