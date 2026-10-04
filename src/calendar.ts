import type { CmEvent } from './types';
import { hasKnownTime } from './format';

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** Escape text for an iCalendar property value (RFC 5545 §3.3.11). */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** 20261004T140000Z */
function utcStamp(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** 20261004 (local calendar date) */
function dateStamp(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}${mm}${dd}`;
}

/** Fold lines longer than 75 octets (approximated as characters) per RFC 5545. */
function fold(line: string): string {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push(line.slice(i, i + 74));
  return parts.join('\r\n ');
}

/** Build an .ics calendar file for one event. Events without a time become all-day. */
export function buildIcs(event: CmEvent, now: Date = new Date()): string {
  const allDay = !hasKnownTime(event.startDate) && !event.endDate;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//cmout//Chelmsford Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@cmout.netlify.app`,
    `DTSTAMP:${utcStamp(now)}`,
  ];

  if (allDay) {
    const next = new Date(event.startDate);
    next.setDate(next.getDate() + 1);
    lines.push(
      `DTSTART;VALUE=DATE:${dateStamp(event.startDate)}`,
      `DTEND;VALUE=DATE:${dateStamp(next)}`
    );
  } else {
    const end =
      event.endDate && event.endDate > event.startDate
        ? event.endDate
        : new Date(event.startDate.getTime() + DEFAULT_DURATION_MS);
    lines.push(`DTSTART:${utcStamp(event.startDate)}`, `DTEND:${utcStamp(end)}`);
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);
  const location = [event.venue, event.address].filter(Boolean).join(', ');
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  const description = [event.description, event.sourceUrl].filter(Boolean).join('\n\n');
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (event.sourceUrl) lines.push(`URL:${event.sourceUrl}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Google Maps directions/search link for an event's location, or null if unknown. */
export function directionsUrl(event: CmEvent): string | null {
  // A named venue plus address finds the right place; fall back to coordinates
  const query = event.address
    ? [event.venue, event.address].filter(Boolean).join(', ')
    : event.latitude != null && event.longitude != null
      ? `${event.latitude},${event.longitude}`
      : event.venue;
  if (!query || /^unknown venue$/i.test(query)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
