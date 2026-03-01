import ical from 'node-ical';
import type { CmEvent, FetchResult, Fetcher } from '../types.js';
import { makeEventId } from '../utils.js';

// Default feeds to try - users can add more via ICAL_FEED_URLS env var
const DEFAULT_FEEDS: { name: string; url: string }[] = [
  // These are speculative - will be validated during testing
  // Essex Libraries (LibCal) - typical URL pattern
  // { name: "Essex Libraries", url: "https://essexlibraries.libcal.com/ical_subscribe.php?..." },
];

function parseIcalEvent(vevent: ical.VEvent, feedName: string): CmEvent | null {
  if (!vevent.start) return null;

  const startDate = vevent.start instanceof Date ? vevent.start : new Date(vevent.start);
  if (isNaN(startDate.getTime())) return null;

  const endDate = vevent.end
    ? vevent.end instanceof Date
      ? vevent.end
      : new Date(vevent.end)
    : null;

  return {
    id: makeEventId('ical', vevent.uid ?? `${feedName}-${startDate.toISOString()}`),
    title: vevent.summary ?? 'Untitled Event',
    description: vevent.description ?? '',
    startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    venue: vevent.location ?? feedName,
    address: vevent.location ?? '',
    category: 'community', // iCal events default to community
    source: 'ical',
    sourceUrl: typeof vevent.url === 'string' ? vevent.url : '',
    latitude: (vevent as unknown as Record<string, unknown>).geo
      ? ((vevent as unknown as Record<string, unknown>).geo as { lat: number }).lat
      : null,
    longitude: (vevent as unknown as Record<string, unknown>).geo
      ? ((vevent as unknown as Record<string, unknown>).geo as { lon: number }).lon
      : null,
    imageUrl: null,
    price: null,
  };
}

async function fetchIcalFeed(name: string, url: string, errors: string[]): Promise<CmEvent[]> {
  const events: CmEvent[] = [];

  try {
    const data = await ical.async.fromURL(url);
    const now = new Date();

    for (const [, component] of Object.entries(data)) {
      if (component.type !== 'VEVENT') continue;
      const vevent = component as ical.VEvent;

      // Only include future events (or events happening today)
      const start = vevent.start instanceof Date ? vevent.start : new Date(vevent.start);
      if (start < new Date(now.toDateString())) continue;

      const event = parseIcalEvent(vevent, name);
      if (event) events.push(event);
    }
  } catch (err) {
    errors.push(`iCal ${name}: ${(err as Error).message}`);
  }

  return events;
}

export const icalFetcher: Fetcher = {
  name: 'ical',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const events: CmEvent[] = [];

    // Collect feed URLs from env + defaults
    const feeds = [...DEFAULT_FEEDS];

    const envUrls = process.env.ICAL_FEED_URLS;
    if (envUrls) {
      for (const url of envUrls
        .split(',')
        .map(u => u.trim())
        .filter(Boolean)) {
        feeds.push({ name: 'Custom', url });
      }
    }

    if (feeds.length === 0) {
      return {
        source: 'ical',
        events: [],
        errors: ['No iCal feeds configured. Set ICAL_FEED_URLS in .env'],
        fetchedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }

    const results = await Promise.allSettled(feeds.map(f => fetchIcalFeed(f.name, f.url, errors)));

    for (const result of results) {
      if (result.status === 'fulfilled') {
        events.push(...result.value);
      } else {
        errors.push(`iCal feed failed: ${result.reason}`);
      }
    }

    return {
      source: 'ical',
      events,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
