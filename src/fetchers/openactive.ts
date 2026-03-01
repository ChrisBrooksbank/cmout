import type { CmEvent, FetchResult, Fetcher, EventCategory } from '../types.js';
import { makeEventId, fetchJson } from '../utils.js';

const FEED_BASE = 'https://opendata.leisurecloud.live/api/feeds/ChelmsfordCitySports-live';

const FEEDS = {
  'session-series': `${FEED_BASE}-session-series`,
  'scheduled-sessions': `${FEED_BASE}-scheduled-sessions`,
  'facility-uses': `${FEED_BASE}-facility-uses`,
  slots: `${FEED_BASE}-slots`,
  'course-instance': `${FEED_BASE}-course-instance`,
} as const;

const MAX_PAGES = 20;

interface RpdeItem {
  state: 'updated' | 'deleted';
  kind: string;
  id: string;
  modified: string;
  data?: Record<string, unknown>;
}

interface RpdePage {
  next: string;
  items: RpdeItem[];
  licence: string;
}

/** Info extracted from a SessionSeries for resolving ScheduledSession references. */
interface SessionSeriesInfo {
  name: string;
  description: string;
  venue: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  category: EventCategory;
  price: string | null;
  url: string;
}

function categoriseActivity(name: string): EventCategory {
  const lower = name.toLowerCase();
  if (/swim|aqua|pool|diving/.test(lower)) return 'fitness-class';
  if (
    /gym|fitness|spin|yoga|pilates|aerobic|hiit|circuit|body\s?pump|body\s?combat|zumba|les mills|boxercise/.test(
      lower
    )
  )
    return 'fitness-class';
  if (/football|cricket|tennis|badminton|basketball|netball|rugby|hockey|athletics/.test(lower))
    return 'sport';
  if (/kids|junior|child|toddler|baby|under\s?\d/.test(lower)) return 'kids';
  return 'fitness-class';
}

/** Fetch all pages of an RPDE feed, collecting raw items. */
async function fetchAllPages(url: string, errors: string[], label: string): Promise<RpdeItem[]> {
  const items: RpdeItem[] = [];
  let nextUrl: string | null = url;
  let page = 0;

  while (nextUrl && page < MAX_PAGES) {
    try {
      const data: RpdePage = await fetchJson<RpdePage>(nextUrl, { timeoutMs: 20000 });
      items.push(...data.items);
      if (data.items.length === 0) break;
      nextUrl = data.next;
      page++;
    } catch (err) {
      errors.push(`OpenActive ${label} page ${page}: ${(err as Error).message}`);
      break;
    }
  }

  return items;
}

/** Build a lookup map from session-series @id URL -> series info. */
function buildSeriesLookup(items: RpdeItem[]): Map<string, SessionSeriesInfo> {
  const lookup = new Map<string, SessionSeriesInfo>();

  for (const item of items) {
    if (item.state === 'deleted' || !item.data) continue;
    const d = item.data;

    const atId = d['@id'] as string | undefined;
    if (!atId) continue;

    const location = d.location as Record<string, unknown> | undefined;
    const geo = location?.geo as Record<string, number> | undefined;
    const addressObj = location?.address as Record<string, unknown> | undefined;

    const offers = d.offers as Array<{ price?: number }> | undefined;

    lookup.set(atId, {
      name: (d.name as string) ?? 'Unknown Activity',
      description: (d.description as string) ?? (d.attendeeInstructions as string) ?? '',
      venue: (location?.name as string) ?? 'Chelmsford City Sports',
      address: addressObj
        ? [addressObj.streetAddress, addressObj.addressLocality, addressObj.postalCode]
            .filter(Boolean)
            .join(', ')
        : '',
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      category: categoriseActivity((d.name as string) ?? ''),
      price: offers?.[0]?.price != null ? `£${offers[0].price.toFixed(2)}` : null,
      url: (d.url as string) ?? atId,
    });
  }

  return lookup;
}

/** Convert a ScheduledSession item into a CmEvent, resolving name from series lookup. */
function parseScheduledSession(
  item: RpdeItem,
  seriesLookup: Map<string, SessionSeriesInfo>
): CmEvent | null {
  if (item.state === 'deleted' || !item.data) return null;
  const d = item.data;

  const startDate = d.startDate ? new Date(d.startDate as string) : null;
  if (!startDate || isNaN(startDate.getTime())) return null;

  const endDate = d.endDate ? new Date(d.endDate as string) : null;

  // Resolve parent session series
  const superEventUrl = d.superEvent as string | undefined;
  const series = superEventUrl ? seriesLookup.get(superEventUrl) : undefined;

  const title = series?.name ?? 'Unknown Activity';

  return {
    id: makeEventId('openactive', item.id),
    title,
    description: series?.description ?? '',
    startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    venue: series?.venue ?? 'Chelmsford City Sports',
    address: series?.address ?? '',
    category: series?.category ?? 'fitness-class',
    source: 'openactive',
    sourceUrl: series?.url ?? '',
    latitude: series?.latitude ?? null,
    longitude: series?.longitude ?? null,
    imageUrl: null,
    price: series?.price ?? null,
  };
}

/** Convert a SessionSeries item into a CmEvent (for series without scheduled sessions). */
function parseSessionSeries(item: RpdeItem): CmEvent | null {
  if (item.state === 'deleted' || !item.data) return null;
  const d = item.data;

  // Session series don't have a single startDate - they have eventSchedule
  // We generate one event per series as a "recurring" marker
  const schedules = d.eventSchedule as Array<Record<string, string>> | undefined;
  if (!schedules?.length) return null;

  // Use today as start for recurring sessions
  const startDate = new Date();
  const location = d.location as Record<string, unknown> | undefined;
  const geo = location?.geo as Record<string, number> | undefined;
  const addressObj = location?.address as Record<string, unknown> | undefined;
  const offers = d.offers as Array<{ price?: number }> | undefined;
  const name = (d.name as string) ?? 'Unknown Activity';

  return {
    id: makeEventId('openactive', `series-${item.id}`),
    title: name,
    description: (d.description as string) ?? '',
    startDate,
    endDate: null,
    venue: (location?.name as string) ?? 'Chelmsford City Sports',
    address: addressObj
      ? [addressObj.streetAddress, addressObj.addressLocality, addressObj.postalCode]
          .filter(Boolean)
          .join(', ')
      : '',
    category: categoriseActivity(name),
    source: 'openactive',
    sourceUrl: (d.url as string) ?? (d['@id'] as string) ?? '',
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    imageUrl: null,
    price: offers?.[0]?.price != null ? `£${offers[0].price.toFixed(2)}` : null,
  };
}

/** Parse facility-use / slot / course-instance items generically. */
function parseGenericItem(item: RpdeItem): CmEvent | null {
  if (item.state === 'deleted' || !item.data) return null;
  const d = item.data;

  const name =
    (d.name as string) ??
    (((d.facilityUse ?? d.superEvent) as Record<string, unknown>)?.name as string) ??
    'Unknown Activity';

  const startDate = d.startDate ? new Date(d.startDate as string) : null;
  if (!startDate || isNaN(startDate.getTime())) return null;

  const endDate = d.endDate ? new Date(d.endDate as string) : null;
  const location = (d.location ?? (d.facilityUse as Record<string, unknown>)?.location) as
    | Record<string, unknown>
    | undefined;
  const geo = location?.geo as Record<string, number> | undefined;

  return {
    id: makeEventId('openactive', item.id),
    title: name,
    description: (d.description as string) ?? '',
    startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    venue: (location?.name as string) ?? 'Chelmsford City Sports',
    address: '',
    category: categoriseActivity(name),
    source: 'openactive',
    sourceUrl: (d.url as string) ?? (d['@id'] as string) ?? '',
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    imageUrl: null,
    price: null,
  };
}

export const openactiveFetcher: Fetcher = {
  name: 'openactive',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const allEvents: CmEvent[] = [];

    // Step 1: Fetch session-series first to build name lookup
    const seriesItems = await fetchAllPages(FEEDS['session-series'], errors, 'session-series');
    const seriesLookup = buildSeriesLookup(seriesItems);

    // Also emit series themselves as "recurring" events
    for (const item of seriesItems) {
      const ev = parseSessionSeries(item);
      if (ev) allEvents.push(ev);
    }

    // Step 2: Fetch scheduled-sessions (these reference series by URL)
    const scheduledItems = await fetchAllPages(
      FEEDS['scheduled-sessions'],
      errors,
      'scheduled-sessions'
    );
    for (const item of scheduledItems) {
      const ev = parseScheduledSession(item, seriesLookup);
      if (ev) allEvents.push(ev);
    }

    // Step 3: Fetch remaining feeds in parallel
    const otherFeeds = (['facility-uses', 'slots', 'course-instance'] as const).map(name =>
      fetchAllPages(FEEDS[name], errors, name)
    );
    const otherResults = await Promise.allSettled(otherFeeds);

    for (const result of otherResults) {
      if (result.status === 'fulfilled') {
        for (const item of result.value) {
          const ev = parseGenericItem(item);
          if (ev) allEvents.push(ev);
        }
      }
    }

    return {
      source: 'openactive',
      events: allEvents,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
