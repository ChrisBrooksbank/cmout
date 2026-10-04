/** Date/time formatting shared by the event feed, cards and detail page. */

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from `now`'s day to `date`'s day (0 = today, 1 = tomorrow). */
function dayOffset(date: Date, now: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

/** Local calendar-day key, e.g. "2026-10-04". */
export function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Sources use midnight when they don't publish a start time. */
export function hasKnownTime(d: Date): boolean {
  return d.getHours() !== 0 || d.getMinutes() !== 0;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** "Sat 10 Oct" / "Saturday 10 October", plus the year only when it isn't this year. */
function formatDate(date: Date, now: Date, style: 'short' | 'long'): string {
  // Built from parts: en-GB inserts a comma after the weekday once a year is included
  const weekday = date.toLocaleDateString('en-GB', { weekday: style });
  const month = date.toLocaleDateString('en-GB', { month: style });
  const year = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${weekday} ${date.getDate()} ${month}${year}`;
}

/** "Today", "Tomorrow" or "Sat 10 Oct" (with the year only when it isn't this year). */
export function formatShortDate(date: Date, now: Date = new Date()): string {
  const offset = dayOffset(date, now);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return formatDate(date, now, 'short');
}

/** Day heading: "Today", "Tomorrow" or "Saturday 10 October". */
export function formatDayHeading(date: Date, now: Date = new Date()): string {
  const offset = dayOffset(date, now);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return formatLongDate(date, now);
}

/** "Saturday 10 October" (with the year only when it isn't this year). */
function formatLongDate(date: Date, now: Date = new Date()): string {
  return formatDate(date, now, 'long');
}

/**
 * When an event happens, e.g. "Today · 19:30–23:00", "Sat 10 Oct · 19:30",
 * "Sat 10 Oct" (no published time) or "Sat 10 Oct 10:00 – Mon 12 Oct 17:00".
 * `long` uses full day/month names for the detail page.
 */
export function formatWhen(
  start: Date,
  end: Date | null,
  { now = new Date(), long = false }: { now?: Date; long?: boolean } = {}
): string {
  const fmtDate = (d: Date) => (long ? formatLongDate(d, now) : formatShortDate(d, now));
  const startDate = fmtDate(start);
  if (!hasKnownTime(start) && (!end || dayKey(end) === dayKey(start))) return startDate;

  const startTime = hasKnownTime(start) ? formatTime(start) : '';
  if (!end || end <= start) return `${startDate} · ${startTime}`;
  if (dayKey(end) === dayKey(start)) return `${startDate} · ${startTime}–${formatTime(end)}`;
  return `${startDate}${startTime ? ` ${startTime}` : ''} – ${fmtDate(end)} ${formatTime(end)}`;
}
