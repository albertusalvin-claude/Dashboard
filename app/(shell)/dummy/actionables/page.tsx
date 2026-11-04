import { connection } from "next/server";
import ActionablesTab from "../../../components/ActionablesTab";
import { projectList } from "../../../lib/actionables";
import { dummyHabits, dummyTasks } from "../../../lib/dummyData";
import { bringBackRecurring, melbourneDay } from "../../../lib/recurrence";

export default async function DummyActionablesPage() {
  await connection();
  const today = melbourneDay();
  // Recurring tasks come back as on the real page, without saving anywhere.
  const tasks = bringBackRecurring(dummyTasks(), today).tasks;
  // Errands has no tasks, to show an empty project; Garden is archived.
  const projects = { all: projectList([...tasks.map((t) => t.project), "Errands"]), archived: ["Garden"] };
  return <ActionablesTab habits={dummyHabits()} tasks={tasks} projects={projects} today={today} />;
}
