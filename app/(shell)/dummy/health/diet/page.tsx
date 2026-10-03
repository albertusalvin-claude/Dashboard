import DietTab from "../../../../components/DietTab";
import { dummyMealPrep, dummyOneOff, dummySmoothies } from "../../../../lib/dummyData";

export default function DummyDietPage() {
  return <DietTab smoothies={dummySmoothies()} mealPrep={dummyMealPrep()} oneOff={dummyOneOff()} />;
}
