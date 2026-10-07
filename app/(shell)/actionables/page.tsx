import ActionablesTab from "../../components/ActionablesTab";
import { getHabits, getTaskProjects, getTasks, isHabitsConfigured, isTasksConfigured } from "../../lib/getActionables";

// Overdue and ended are judged against the dashboard owner's calendar day,
// not the server's (UTC on Vercel).
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

export default async function ActionablesPage() {
  const [habits, tasks] = await Promise.all([
    isHabitsConfigured() ? getHabits() : null,
    isTasksConfigured() ? getTasks() : null,
  ]);
  const projects = tasks ? await getTaskProjects(tasks) : { all: [], archived: [] };
  return <ActionablesTab habits={habits} tasks={tasks} projects={projects} today={today()} />;
}
