import type { Dish, Smoothie } from "../lib/dietMenu";
import DishMenu from "./DishMenu";
import SmoothieMenu from "./SmoothieMenu";

const MACROS = [
  { label: "Calories", value: "2,250", unit: "kcal", note: "+250 surplus", color: "#CB3A1E" },
  { label: "Protein", value: "100", unit: "g", note: "~1.7 g/kg", color: "#4E7043" },
  { label: "Fat", value: "75", unit: "g", note: "mono + omega-3", color: "#B4832A" },
  { label: "Carbs", value: "295", unit: "g", note: "rice + fruit", color: "#403A7A" },
  { label: "Fiber", value: "35", unit: "g", note: "smoothie-led", color: "#4E7043" },
];

type MicroTag = "covered" | "supp" | "watch";
const MICRO_TAG_STYLE: Record<MicroTag, { background: string; color: string }> = {
  covered: { background: "rgba(78,112,67,0.16)", color: "#4E7043" },
  supp: { background: "rgba(203,58,30,0.14)", color: "#CB3A1E" },
  watch: { background: "rgba(180,131,42,0.18)", color: "#B4832A" },
};

const MICROS: { name: string; amount: string; src: string; tag: MicroTag; tagLabel: string }[] = [
  { name: "Vitamin D", amount: "1,000–2,000 IU", src: "Supplement (you take 1,000 IU)", tag: "supp", tagLabel: "Supplement" },
  { name: "Omega-3 EPA+DHA", amount: "500–1,000 mg", src: "Fish oil 600 mg + skipjack tuna", tag: "supp", tagLabel: "Supplement + food" },
  { name: "Vitamin K", amount: "120 µg", src: "Kale smoothie (far exceeds)", tag: "covered", tagLabel: "Covered" },
  { name: "Vitamin C", amount: "90 mg", src: "Blueberries, kale, bok choy", tag: "covered", tagLabel: "Covered" },
  { name: "Vitamin A", amount: "900 µg", src: "Kale (absorbed via avocado fat)", tag: "covered", tagLabel: "Covered" },
  { name: "Potassium", amount: "3,400 mg", src: "Avocado, kale, fish, greens", tag: "covered", tagLabel: "Covered" },
  { name: "Magnesium", amount: "400 mg", src: "Greens, nuts, seeds — aids sleep", tag: "covered", tagLabel: "Covered" },
  { name: "Calcium", amount: "1,000 mg", src: "Bok choy, Greek yogurt, kale", tag: "watch", tagLabel: "Watch on dumpling week" },
  { name: "Folate", amount: "400 µg", src: "Greens, legumes — thin on dumpling week", tag: "watch", tagLabel: "Add greens" },
  { name: "Zinc", amount: "11 mg", src: "Pork, chicken, tuna", tag: "covered", tagLabel: "Covered" },
  { name: "Selenium", amount: "55 µg", src: "Tuna, fish, eggs", tag: "covered", tagLabel: "Covered" },
  { name: "Plant variety", amount: "30+ / week", src: "One rotating frozen veg bag helps", tag: "watch", tagLabel: "Rotate weekly" },
];

const RULES: { title: string; count: string; body: string; color: string }[] = [
  { title: "Office lunch", count: "3 / week", body: "Bring batch leftovers — dumplings and ginger chicken both reheat well. Keep mixed nuts + fruit at your desk; that stash alone is your ~250 kcal surplus.", color: "#B4832A" },
  { title: "Eating out", count: "4 / week", body: "Your wildcard — it can fill gaps or widen them. One rule covers most of it: order something with vegetables, and fish when it's on the menu.", color: "#403A7A" },
];

function SectionHead({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6">
      <span className="font-mono text-sm font-bold shrink-0" style={{ color: "#CB3A1E" }}>{num}</span>
      <div>
        <h2 className="font-display font-bold text-3xl text-ink tracking-tight">{title}</h2>
        <p className="text-sm text-ink-soft mt-1 max-w-xl">{sub}</p>
      </div>
    </div>
  );
}

function NotConnected({ envVar }: { envVar: string }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-6 text-sm text-ink-soft">
      Not connected yet — add{" "}
      <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">{envVar}</code> to{" "}
      <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">.env.local</code> and Vercel.
    </div>
  );
}

type Props = {
  /** Null when the Notion database isn't configured. */
  smoothies: Smoothie[] | null;
  mealPrep: Dish[] | null;
  oneOff: Dish[] | null;
};

export default function DietTab({ smoothies, mealPrep, oneOff }: Props) {
  const beefDishes = (mealPrep ?? []).filter((d) => d.type === "beef").map((d) => d.name);

  return (
    <div className="space-y-14">

      {/* 01 Smoothies */}
      <section>
        <SectionHead
          num="01"
          title="Smoothies"
          sub="Breakfast blends. Drag a card to reorder; Edit to change or delete one."
        />
        {smoothies ? <SmoothieMenu smoothies={smoothies} /> : <NotConnected envVar="NOTION_SMOOTHIES_ID" />}
      </section>

      {/* 02 Meal Prep */}
      <section>
        <SectionHead
          num="02"
          title="Meal prep"
          sub="Every dish you batch-cook. Add cost and nutrition as you work them out — totals and per-serve figures follow."
        />
        {mealPrep ? (
          <DishMenu kind="mealPrep" dishes={mealPrep} gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3" />
        ) : (
          <NotConnected envVar="NOTION_MEAL_PREP_ID" />
        )}
        <div className="mt-4 rounded-2xl p-4 text-sm text-ink" style={{ background: "rgba(203,58,30,0.09)", border: "1px solid rgba(203,58,30,0.3)" }}>
          <strong className="font-display text-chili">Red-meat cap:</strong>{" "}
          {beefDishes.length > 0 &&
            `${beefDishes.length === 1 ? "one dish here is" : `${beefDishes.length} dishes here are`} beef (${beefDishes.join(", ")}). `}
          Keep red meat to roughly 2–3 dinners a week and let fish, chicken, egg and tuna carry the rest — the one food category the longevity evidence is consistent about moderating.
        </div>
      </section>

      {/* 03 One-off */}
      <section>
        <SectionHead
          num="03"
          title="One-off dishes"
          sub="Cooked occasionally rather than batched — your omega-3 constants and easy calorie options."
        />
        {oneOff ? (
          <DishMenu kind="oneOff" dishes={oneOff} gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3" />
        ) : (
          <NotConnected envVar="NOTION_ONE_OFF_ID" />
        )}
      </section>

      {/* 04 Rules */}
      <section>
        <SectionHead
          num="04"
          title="The meals you don't cook"
          sub="Simple defaults for the 7 meals a week that happen at the office or out."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RULES.map(({ title, count, body, color }) => (
            <div key={title} className="bg-card border border-line rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
                <h4 className="font-display font-bold text-base text-ink">{title}</h4>
                <span className="font-mono text-xs text-ink-soft ml-auto">{count}</span>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 05 Targets — reference, collapsed by default */}
      <details className="group">
        <summary className="flex items-baseline gap-4 cursor-pointer list-none select-none">
          <span className="font-mono text-sm font-bold shrink-0" style={{ color: "#CB3A1E" }}>05</span>
          <div>
            <h2 className="font-display font-bold text-3xl text-ink tracking-tight">
              Targets{" "}
              <span className="font-mono text-base text-ink-soft font-normal group-open:hidden">▸ show</span>
              <span className="font-mono text-base text-ink-soft font-normal hidden group-open:inline">▾ hide</span>
            </h2>
            <p className="text-sm text-ink-soft mt-1 max-w-xl">Daily macro and micro targets the menu above is built to hit.</p>
          </div>
        </summary>
        <div className="mt-6 space-y-10">
          <div className="max-w-2xl text-sm bg-amber-50 border-l-4 px-4 py-3 rounded-r-lg text-ink leading-relaxed" style={{ borderLeftColor: "#B4832A", background: "rgba(180,131,42,0.1)" }}>
            Targets calibrated to <strong>59.1 kg</strong> (12 Jul 2026) and moderate activity, for a gentle ~250 kcal daily surplus.
            Goal: <strong>63.1 kg by mid-December</strong> — about +180 g/week.
          </div>
          <section>
            <div className="mb-4">
              <h3 className="font-display font-bold text-xl text-ink tracking-tight">Daily macro targets</h3>
              <p className="text-sm text-ink-soft mt-1 max-w-xl">A modest surplus built from calorie-dense, longevity-friendly foods — not bigger volumes.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {MACROS.map(({ label, value, unit, note, color }) => (
                <div key={label} className="bg-card border border-line rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: color }} />
                  <p className="text-xs text-ink-soft font-medium pl-3">{label}</p>
                  <p className="font-mono font-bold leading-none mt-3 pl-3" style={{ fontSize: "clamp(22px,2.8vw,32px)" }}>
                    {value}
                    <span className="text-sm font-normal text-ink-soft"> {unit}</span>
                  </p>
                  <p className="font-mono text-xs text-ink-soft mt-2 pl-3">{note}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h3 className="font-display font-bold text-xl text-ink tracking-tight">Daily micro targets</h3>
              <p className="text-sm text-ink-soft mt-1 max-w-xl">Most are covered by the daily smoothie and your dishes. Two are supplement-backed; a few deserve a weekly glance.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-px bg-line border border-line rounded-2xl overflow-hidden">
              {MICROS.map(({ name, amount, src, tag, tagLabel }) => (
                <div key={name} className="bg-card p-4 flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink text-sm">{name}</span>
                    <span className="font-mono text-xs text-ink-soft whitespace-nowrap">{amount}</span>
                  </div>
                  <p className="text-xs text-ink-soft">{src}</p>
                  <span
                    className="mt-1 text-xs font-mono tracking-wide uppercase px-2 py-0.5 rounded-full w-fit"
                    style={MICRO_TAG_STYLE[tag]}
                  >
                    {tagLabel}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>

    </div>
  );
}
