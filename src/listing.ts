import type { CmEvent, EventCategory } from './types';
import { dayKey } from './format';

/** A single event, or several sessions of the same activity at one venue on one day. */
export type FeedItem =
  | { kind: 'event'; key: string; event: CmEvent }
  | { kind: 'sessions'; key: string; events: CmEvent[] };

export interface DaySection {
  key: string;
  date: Date;
  /** One-off events (gigs, theatre, community…), shown first. */
  highlights: FeedItem[];
  /** Timetabled leisure-centre sessions, grouped by activity. */
  sessions: FeedItem[];
  eventCount: number;
}

/** Leisure-centre timetables (OpenActive) list many repeat sessions a day. */
function isTimetabledSession(event: CmEvent): boolean {
  return event.source === 'openactive';
}

/** Interleave categories so no more than `maxConsecutive` of one appear in a row. */
export function balanceEventsByCategory(events: CmEvent[], maxConsecutive = 2): CmEvent[] {
  if (events.length <= maxConsecutive || maxConsecutive < 1) return events;

  const buckets = new Map<EventCategory, CmEvent[]>();
  const categoryOrder: EventCategory[] = [];

  for (const event of events) {
    if (!buckets.has(event.category)) {
      buckets.set(event.category, []);
      categoryOrder.push(event.category);
    }
    buckets.get(event.category)?.push(event);
  }

  if (categoryOrder.length <= 1) return events;

  const balanced: CmEvent[] = [];
  let lastCategory: EventCategory | null = null;
  let consecutive = 0;

  while (balanced.length < events.length) {
    const availableCategories = categoryOrder.filter(
      category => (buckets.get(category)?.length ?? 0) > 0
    );
    if (availableCategories.length === 0) break;

    let category = availableCategories[0];
    if (lastCategory && consecutive >= maxConsecutive && availableCategories.length > 1) {
      category = availableCategories.find(candidate => candidate !== lastCategory) ?? category;
    }

    const next = buckets.get(category)?.shift();
    if (!next) continue;

    balanced.push(next);
    if (category === lastCategory) {
      consecutive += 1;
    } else {
      lastCategory = category;
      consecutive = 1;
    }
  }

  return balanced;
}

/** Fold events with the same title and venue into one item, in first-seen order. */
export function groupRepeats(events: CmEvent[]): FeedItem[] {
  const items: FeedItem[] = [];
  const groups = new Map<string, CmEvent[]>();
  for (const event of events) {
    const key = `${event.title.trim().toLowerCase()}|${event.venue.toLowerCase()}`;
    const group = groups.get(key);
    if (group) {
      group.push(event);
      continue;
    }
    const fresh = [event];
    groups.set(key, fresh);
    items.push({ kind: 'sessions', key: `${key}|${event.id}`, events: fresh });
  }
  // Groups of one are just events
  return items.map(item =>
    item.kind === 'sessions' && item.events.length === 1
      ? { kind: 'event', key: item.events[0].id, event: item.events[0] }
      : item
  );
}

/**
 * Split events into day sections in date order. Events that started before
 * today but are still running are listed under today.
 */
export function buildDaySections(
  events: CmEvent[],
  { now = new Date(), balance = false }: { now?: Date; balance?: boolean } = {}
): DaySection[] {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sorted = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const byDay = new Map<string, { date: Date; highlights: CmEvent[]; sessions: CmEvent[] }>();
  for (const event of sorted) {
    const listedOn = event.startDate < todayStart ? todayStart : event.startDate;
    const key = dayKey(listedOn);
    let day = byDay.get(key);
    if (!day) {
      day = { date: listedOn, highlights: [], sessions: [] };
      byDay.set(key, day);
    }
    (isTimetabledSession(event) ? day.sessions : day.highlights).push(event);
  }

  return Array.from(byDay.entries()).map(([key, day]) => ({
    key,
    date: day.date,
    highlights: groupRepeats(balance ? balanceEventsByCategory(day.highlights) : day.highlights),
    sessions: groupRepeats(day.sessions),
    eventCount: day.highlights.length + day.sessions.length,
  }));
}
