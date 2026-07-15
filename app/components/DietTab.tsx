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

type DishType = "veg" | "beef" | "carb" | "egg";
const DISH_BORDER: Record<DishType, string> = {
  veg: "#4E7043",
  beef: "#CB3A1E",
  carb: "#B4832A",
  egg: "#403A7A",
};

const MEAL_PREP: {
  name: string;
  type: DishType;
  notes: string;
  cost?: { perServe: string; batchTotal: string; items: { ingredient: string; cost: string }[]; note: string };
  nutrition?: { summary: string; items: { label: string; value: string }[]; note: string };
}[] = [
  {
    name: "Capcai",
    type: "veg",
    notes: "The standout — a mixed-veg stir-fry that alone pushes toward 30 plants/week. Cook with chicken, prawns or egg and be generous with oil, since it's light on calories solo.",
    cost: {
      perServe: "$3.57",
      batchTotal: "$17.86",
      items: [
        { ingredient: "Chicken thigh (pack)", cost: "$5.71" },
        { ingredient: "Fish ball 500 g", cost: "$4.41" },
        { ingredient: "Broccoli 502 g", cost: "$2.03" },
        { ingredient: "Spring onion", cost: "$1.50" },
        { ingredient: "Garlic (~½ pack)", cost: "$1.05" },
        { ingredient: "Ginger", cost: "$1.00" },
        { ingredient: "Snow peas 92 g", cost: "$0.82" },
        { ingredient: "Beef stock (~½ L)", cost: "$0.68" },
        { ingredient: "Oil (~2 tbsp)", cost: "$0.30" },
        { ingredient: "Carrot 117 g", cost: "$0.27" },
        { ingredient: "Cornflour (~1 tbsp)", cost: "$0.09" },
      ],
      note: "Woolworths prices after 10% member discount. Batch of 5 portions.",
    },
    nutrition: {
      summary: "379 kcal · 38 g protein",
      items: [
        { label: "Calories", value: "379 kcal" },
        { label: "Protein", value: "38 g" },
        { label: "Fat", value: "17 g" },
        { label: "Carbs", value: "22 g" },
        { label: "Fiber", value: "4 g" },
      ],
      note: "Per portion, excluding rice. Rice adds ~300 kcal. Each extra tbsp of oil adds ~120 kcal — oil is the lever if gaining feels slow.",
    },
  },
  {
    name: "Ginger fish",
    type: "egg",
    notes: "Basa + ginger, chili, garlic + bok choy, over rice. Most complete week — protein, calcium (bok choy), vitamins. Add generous rice + a drizzle of sesame or olive oil for calories. Basa has almost no omega-3, so lean on tuna/fish-oil that week.",
  },
  {
    name: "Pork & chives dumplings",
    type: "carb",
    notes: "Ground pork + chives, steamed with rice. Protein, fat, calories (your richest week). Steamed greens essential — the dish has none; fold shiitake or cabbage into the filling. Highest sodium week — go lighter on oyster sauce + chicken powder.",
  },
  {
    name: "Ginger chicken",
    type: "veg",
    notes: "Skinless drumstick (or thigh) + ginger, garlic, chili. Lean protein, B vitamins, zinc, selenium. Use two drumsticks not one; greens on the side; extra dash of sesame oil. Light on calories & veg — nuts as a snack that week.",
  },
  {
    name: "Sapi cincang + kacang panjang",
    type: "beef",
    notes: "Minced beef + long beans: protein and a green in one pan. Best-balanced of the beef dishes thanks to the beans — but it counts toward your red-meat cap.",
  },
  {
    name: "Beef steak + kimchi",
    type: "beef",
    notes: "Best of the beef dishes for longevity — the fermented kimchi feeds your gut microbiome. Iron, zinc, B12, creatine all help muscle gain in a surplus.",
  },
  {
    name: "Beef teriyaki",
    type: "beef",
    notes: "Calorie-dense and useful for gaining, but the sauce is the saltiest and sugariest here — space it out and go easy on the glaze.",
  },
  {
    name: "Spaghetti bolognese",
    type: "beef",
    notes: "Stretches beautifully: cut the beef 50/50 with lentils or extra tomato + mushroom to lower the meat load while adding fiber and lycopene.",
  },
  {
    name: "Kangkung cah ayam",
    type: "veg",
    notes: "Stir-fry on high heat — garlic and chilli first until fragrant, add chicken until just cooked through, then fishballs and tomato for a minute, kangkung last (wilts in 30 s). Dash of fish sauce to finish. Keep the heat high so the kangkung stays vibrant rather than soggy.",
    cost: {
      perServe: "$4.90",
      batchTotal: "$24.50",
      items: [
        { ingredient: "Chicken thigh ~750 g", cost: "$11.00" },
        { ingredient: "Kangkung × 3 bunches", cost: "$5.00" },
        { ingredient: "Fish ball 400 g (~20 balls)", cost: "$5.00" },
        { ingredient: "Tomato × 2", cost: "$1.00" },
        { ingredient: "Chilli × 5", cost: "$1.00" },
        { ingredient: "Oil (~5 tbsp)", cost: "$0.75" },
        { ingredient: "Garlic (~½ pack)", cost: "$0.55" },
        { ingredient: "Fish sauce", cost: "$0.20" },
      ],
      note: "Woolworths prices after 10% member discount. Batch of 5 portions.",
    },
    nutrition: {
      summary: "550 kcal · 40 g protein",
      items: [
        { label: "Calories", value: "550 kcal" },
        { label: "Protein", value: "40 g" },
        { label: "Fat", value: "32 g" },
        { label: "Carbs", value: "20 g" },
        { label: "Fiber", value: "2 g" },
      ],
      note: "Per serve, excluding rice. Rice adds ~300 kcal. Most energy comes from the chicken thigh and cooking oil — kangkung itself is very low-calorie but packs iron, folate, and vitamin K.",
    },
  },
];

const ONE_OFF: { name: string; type: DishType; notes: string }[] = [
  { name: "Kwetiau siram", type: "carb", notes: "Flat noodles in savory gravy — easy calories, but the gravy is sodium-heavy, so this is a go-light-on-the-sauce dish." },
  { name: "Bubur ikan / sapi", type: "carb", notes: "Congee — great for low-appetite days when you still need calories. Pick the fish version: lighter on saturated fat and adds a little omega-3." },
  { name: "Kuah telor", type: "egg", notes: "Egg soup — complete protein with choline and a little vitamin D, which is otherwise scarce in your rotation. Good light main or protein-boosting side." },
  { name: "Spaghetti tuna", type: "egg", notes: "Already your omega-3 constant. Skipjack in oil, plus tomatoes/spinach/peas and generous olive oil." },
];

const RULES: { title: string; count: string; body: string; color: string }[] = [
  { title: "Office lunch", count: "3 / week", body: "Bring batch leftovers — dumplings and ginger chicken both reheat well. Keep mixed nuts + fruit at your desk; that stash alone is your ~250 kcal surplus.", color: "#B4832A" },
  { title: "Eating out", count: "4 / week", body: "Your wildcard — it can fill gaps or widen them. One rule covers most of it: order something with vegetables, and fish when it's on the menu.", color: "#403A7A" },
  { title: "One-off dishes", count: "2 / week", body: "Tuna pasta (skipjack, in oil) + a salmon or other fish dish. Together they're your omega-3 constant. Be generous with olive oil.", color: "#CB3A1E" },
  { title: "Before bed", count: "nightly", body: "Two kiwis about an hour before sleep, plus moderate carbs at dinner. Finish eating 2–3 hours before bed; no caffeine after noon.", color: "#4E7043" },
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

function DishCard({
  name,
  type,
  role,
  notes,
  cost,
  nutrition,
}: {
  name: string;
  type: DishType;
  role: string;
  notes: string;
  cost?: (typeof MEAL_PREP)[0]["cost"];
  nutrition?: (typeof MEAL_PREP)[0]["nutrition"];
}) {
  return (
    <div
      className="bg-card border border-line rounded-2xl p-4 border-l-4"
      style={{ borderLeftColor: DISH_BORDER[type] }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-semibold text-ink text-base">{name}</span>
        <span className="text-xs font-mono uppercase tracking-wide text-ink-soft border border-line rounded-full px-2 py-0.5 shrink-0">
          {role}
        </span>
      </div>
      <div className="border-t border-line">
        {cost && (
          <details className="border-b border-line group">
            <summary className="flex items-center justify-between gap-2 py-2.5 cursor-pointer list-none text-sm font-semibold text-ink select-none">
              Cost
              <span className="font-mono text-xs text-ink-soft">{cost.perServe} / serve</span>
            </summary>
            <div className="pb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left pb-1.5 text-ink-soft font-mono uppercase tracking-wide font-normal">Ingredient</th>
                    <th className="text-right pb-1.5 text-ink-soft font-mono uppercase tracking-wide font-normal">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.items.map((row) => (
                    <tr key={row.ingredient} className="border-b border-line last:border-0">
                      <td className="py-1.5 text-ink">{row.ingredient}</td>
                      <td className="py-1.5 text-right font-mono text-ink">{row.cost}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2" style={{ borderColor: "rgba(27,51,39,0.28)" }}>
                    <td className="pt-2 font-bold text-ink font-display">Batch of 5</td>
                    <td className="pt-2 text-right font-mono font-bold text-ink">{cost.batchTotal}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-ink-soft mt-2 leading-relaxed">{cost.note}</p>
            </div>
          </details>
        )}
        {nutrition && (
          <details className="border-b border-line">
            <summary className="flex items-center justify-between gap-2 py-2.5 cursor-pointer list-none text-sm font-semibold text-ink select-none">
              Nutrition
              <span className="font-mono text-xs text-ink-soft">{nutrition.summary}</span>
            </summary>
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
              <p className="text-xs text-ink-soft mt-2 leading-relaxed">{nutrition.note}</p>
            </div>
          </details>
        )}
        <details>
          <summary className="flex items-center justify-between gap-2 py-2.5 cursor-pointer list-none text-sm font-semibold text-ink select-none">
            Notes
          </summary>
          <p className="text-xs text-ink-soft pb-3 leading-relaxed">{notes}</p>
        </details>
      </div>
    </div>
  );
}

export default function DietTab() {
  return (
    <div className="space-y-14">

      {/* Header */}
      <div className="border-b-2 border-ink pb-7">
        <p className="font-mono text-xs tracking-widest uppercase text-kale mb-3">Personal Nutrition Plan · Longevity Build</p>
        <h2 className="font-display font-extrabold leading-none tracking-tight" style={{ fontSize: "clamp(32px,5.5vw,58px)" }}>
          Eat to gain <span className="text-chili">lean</span>, sleep deeper, age slower.
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 font-mono text-sm text-ink-soft">
          {["+4 kg over 5 months", "Longevity-first choices", "Better sleep"].map((g) => (
            <span key={g} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-kale inline-block" />
              {g}
            </span>
          ))}
        </div>
        <div className="mt-4 max-w-2xl text-sm bg-amber-50 border-l-4 px-4 py-3 rounded-r-lg text-ink leading-relaxed" style={{ borderLeftColor: "#B4832A", background: "rgba(180,131,42,0.1)" }}>
          Targets calibrated to <strong>59.1 kg</strong> (12 Jul 2026) and moderate activity, for a gentle ~250 kcal daily surplus.
          Goal: <strong>63.1 kg by mid-December</strong> — about +180 g/week.
        </div>
      </div>

      {/* 01 Macros */}
      <section>
        <SectionHead
          num="01"
          title="Daily macro targets"
          sub="A modest surplus built from calorie-dense, longevity-friendly foods — not bigger volumes."
        />
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

      {/* 02 Micros */}
      <section>
        <SectionHead
          num="02"
          title="Daily micro targets"
          sub="Most are covered by the daily smoothie and your dishes. Two are supplement-backed; a few deserve a weekly glance."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line rounded-2xl overflow-hidden">
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

      {/* 03 Smoothie */}
      <section>
        <SectionHead
          num="03"
          title="Daily smoothie"
          sub="Every morning — kale · blueberries · ½ avocado · water + peanut butter & Greek yogurt when you like."
        />
        <div className="bg-card border border-line rounded-2xl p-6 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm text-ink-soft font-mono">
            <strong className="text-ink font-display text-2xl mr-1">485 kcal</strong>
            <span>17 g protein · 28.7 g fat · 47.4 g carbs · 15.3 g fiber</span>
          </div>
          <div className="border-t border-line">
            <details>
              <summary className="flex items-center justify-between gap-2 py-3 cursor-pointer list-none font-semibold text-sm text-ink select-none">
                Cost breakdown
                <span className="font-mono text-xs text-ink-soft">≈ $5.05 / serve</span>
              </summary>
              <div className="pb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left pb-1.5 font-mono uppercase tracking-wide text-ink-soft font-normal">Ingredient</th>
                      <th className="text-center pb-1.5 font-mono uppercase tracking-wide text-ink-soft font-normal">Per serve</th>
                      <th className="text-right pb-1.5 font-mono uppercase tracking-wide text-ink-soft font-normal">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Frozen blueberries", "⅙ bag (~165 g)", "$2.00"],
                      ["Avocado", "½", "$1.10"],
                      ["Kale (leaf)", "¼ bunch", "$1.03"],
                      ["Greek yogurt", "½ cup (~125 g)", "$0.47"],
                      ["Chia seeds", "1 tbsp (~12 g)", "$0.31"],
                      ["Peanut butter", "1 tbsp (~16 g)", "$0.14"],
                      ["Water", "1 cup", "$0.00"],
                    ].map(([ing, per, cost]) => (
                      <tr key={ing} className="border-b border-line last:border-0">
                        <td className="py-1.5 text-ink">{ing}</td>
                        <td className="py-1.5 text-center text-ink-soft">{per}</td>
                        <td className="py-1.5 text-right font-mono text-ink">{cost}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2" style={{ borderColor: "rgba(27,51,39,0.28)" }}>
                      <td className="pt-2 font-bold font-display text-ink">Total</td>
                      <td />
                      <td className="pt-2 text-right font-mono font-bold text-ink">$5.05</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                  Prices from Woolworths Metro after 10% member discount. One blueberry bag stretches to 6 servings, one kale bunch to ~4 days.
                </p>
              </div>
            </details>
          </div>
          <div className="border-t border-line">
            <details>
              <summary className="flex items-center justify-between gap-2 py-3 cursor-pointer list-none font-semibold text-sm text-ink select-none">
                Nutrition breakdown
                <span className="font-mono text-xs text-ink-soft">485 kcal · 17 g protein</span>
              </summary>
              <div className="pb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line">
                      {["Ingredient", "kcal", "Protein", "Fat", "Carb", "Fiber"].map((h, i) => (
                        <th key={h} className={`pb-1.5 font-mono uppercase tracking-wide text-ink-soft font-normal ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Avocado (70 g)", 112, 1.4, 10.3, 5.9, 4.7],
                      ["Greek yogurt (125 g)", 113, 7.5, 5.6, 7.5, 0],
                      ["Peanut butter (16 g)", 94, 4.0, 8.0, 3.2, 1.0],
                      ["Blueberries (165 g)", 94, 1.2, 0.5, 23.9, 4.0],
                      ["Chia (12 g)", 58, 2.0, 3.7, 5.0, 4.1],
                      ["Kale leaf (40 g)", 14, 1.2, 0.6, 1.8, 1.6],
                    ].map(([name, kcal, p, f, c, fi]) => (
                      <tr key={name as string} className="border-b border-line last:border-0">
                        <td className="py-1.5 text-ink">{name}</td>
                        {[kcal, p, f, c, fi].map((v, i) => (
                          <td key={i} className="py-1.5 text-right font-mono text-ink">{v}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t-2" style={{ borderColor: "rgba(27,51,39,0.28)" }}>
                      <td className="pt-2 font-bold font-display text-ink">Total</td>
                      {[485, 17.3, 28.7, 47.4, 15.3].map((v, i) => (
                        <td key={i} className="pt-2 text-right font-mono font-bold text-ink">{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                  ~26 g of the carbs are natural fruit + dairy sugar, packaged with 15 g fiber. Big micronutrient load — vitamin K, C, potassium — and ~2 g ALA omega-3 from the chia.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* 04 Meal Prep */}
      <section>
        <SectionHead
          num="04"
          title="Meal prep"
          sub="Every dish you batch-cook. Capcai is fully costed and nutritioned — the rest populate as you add details."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MEAL_PREP.map((dish) => (
            <DishCard
              key={dish.name}
              name={dish.name}
              type={dish.type}
              role="Prep"
              notes={dish.notes}
              cost={dish.cost}
              nutrition={dish.nutrition}
            />
          ))}
        </div>
        <div className="mt-4 rounded-2xl p-4 text-sm text-ink" style={{ background: "rgba(203,58,30,0.09)", border: "1px solid rgba(203,58,30,0.3)" }}>
          <strong className="font-display text-chili">Red-meat cap:</strong> four dishes here are beef (sapi cincang, steak + kimchi, teriyaki, bolognese).
          Keep red meat to roughly 2–3 dinners a week and let fish, chicken, egg and tuna carry the rest — the one food category the longevity evidence is consistent about moderating.
        </div>
      </section>

      {/* 05 One-off */}
      <section>
        <SectionHead
          num="05"
          title="One-off dishes"
          sub="Cooked occasionally rather than batched — your omega-3 constants and easy calorie options."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ONE_OFF.map((dish) => (
            <DishCard
              key={dish.name}
              name={dish.name}
              type={dish.type}
              role="One-off"
              notes={dish.notes}
            />
          ))}
        </div>
      </section>

      {/* 06 Rules */}
      <section>
        <SectionHead
          num="06"
          title="The meals you don't cook"
          sub="Simple defaults for the 9 meals that happen at the office, out, or as one-offs."
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

      {/* Footer */}
      <footer className="border-t-2 border-ink pt-5 text-sm text-ink-soft leading-relaxed">
        <strong className="text-ink">The whole system in one line:</strong> daily smoothie for breakfast, one batch protein per week always cooked with greens,
        tuna pasta + a fish dish inserted as the omega-3 constant, vitamin D and fish oil taken with a fatty meal, and two kiwis before bed.
        Calories come from oil, nuts, bigger protein portions and rice — not bigger volumes.
      </footer>

    </div>
  );
}
