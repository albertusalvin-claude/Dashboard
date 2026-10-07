import { connection } from "next/server";
import ActionablesTab from "../../../components/ActionablesTab";
import { projectList } from "../../../lib/actionables";
import { dummyHabits, dummyTasks } from "../../../lib/dummyData";

export default async function DummyActionablesPage() {
  await connection();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  const tasks = dummyTasks();
  // Errands has no tasks, to show an empty project; Garden is archived.
  const projects = { all: projectList([...tasks.map((t) => t.project), "Errands"]), archived: ["Garden"] };
  return <ActionablesTab habits={dummyHabits()} tasks={tasks} projects={projects} today={today} />;
}
