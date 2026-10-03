import { connection } from "next/server";
import ActionablesTab from "../../../components/ActionablesTab";
import { dummyHabits, dummyTasks } from "../../../lib/dummyData";

export default async function DummyActionablesPage() {
  await connection();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  return <ActionablesTab habits={dummyHabits()} tasks={dummyTasks()} today={today} />;
}
