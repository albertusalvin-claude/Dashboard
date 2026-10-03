import DietTab from "../../../components/DietTab";
import { getDishes, getSmoothies, isDishMenuConfigured, isSmoothiesConfigured } from "../../../lib/getDietMenu";

// Each section reads null when its database isn't configured, and says so.
export default async function DietPage() {
  const [smoothies, mealPrep, oneOff] = await Promise.all([
    isSmoothiesConfigured() ? getSmoothies() : null,
    isDishMenuConfigured("mealPrep") ? getDishes("mealPrep") : null,
    isDishMenuConfigured("oneOff") ? getDishes("oneOff") : null,
  ]);
  return <DietTab smoothies={smoothies} mealPrep={mealPrep} oneOff={oneOff} />;
}
