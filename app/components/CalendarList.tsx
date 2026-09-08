import type { CalendarEventSummary } from "../lib/googleCalendar";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${+d} ${MONTHS[+m - 1]} ${y}`;
}

type Props = { events: CalendarEventSummary[] };

export default function CalendarList({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="bg-card border border-line rounded-2xl p-8 text-center">
        <p className="text-ink font-semibold mb-1">Nothing on the calendar yet.</p>
        <p className="text-ink-soft text-sm">
          Accepted movies (and later, football/fight/badminton) will show up here once they&apos;re on Google Calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <a
          key={event.id}
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-card border border-line rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-ink-soft transition-colors"
        >
          <span className="font-display font-bold text-lg text-ink truncate">{event.name}</span>
          <span className="text-xs font-mono text-ink-soft shrink-0">{fmt(event.date)}</span>
        </a>
      ))}
    </div>
  );
}
