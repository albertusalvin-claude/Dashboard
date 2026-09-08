import CalendarList from "../../components/CalendarList";
import { listUpcomingEvents } from "../../lib/googleCalendar";

export default async function CalendarPage() {
  const events = await listUpcomingEvents();
  return <CalendarList events={events} />;
}
