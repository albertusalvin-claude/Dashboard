import ActionablesTab from "../../components/ActionablesTab";
import {
  getHabits,
  getTaskProjects,
  getTasks,
  isHabitsConfigured,
  isTasksConfigured,
  returnRecurringTasks,
} from "../../lib/getActionables";
import { melbourneDay } from "../../lib/recurrence";

export default async function ActionablesPage() {
  // Overdue, ended and recurring are judged against the dashboard owner's
  // calendar day, not the server's (UTC on Vercel).
  const today = melbourneDay();
  const [habits, tasks] = await Promise.all([
    isHabitsConfigured() ? getHabits() : null,
    // Recurring tasks that are due again come back to Todo as they're read.
    isTasksConfigured() ? getTasks().then((all) => returnRecurringTasks(all, today)) : null,
  ]);
  const projects = tasks ? await getTaskProjects(tasks) : { all: [], archived: [] };
  return <ActionablesTab habits={habits} tasks={tasks} projects={projects} today={today} />;
}
