import type { CmEvent, FetchResult, Fetcher, EventCategory } from '../types.js';
import { makeEventId, safeParseFloat, normalisePrice } from '../utils.js';

/**
 * Eventbrite scraper.
 * Extracts event data from window.__SERVER_DATA__ JSON embedded in the search page HTML.
 * No API key required.
 */

const SEARCH_URL = 'https://www.eventbrite.co.uk/d/united-kingdom--chelmsford/all-events/';

interface EventbriteEvent {
  id: string;
  name: string;
  url: string;
  start_date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  end_date: string;
  end_time: string;
  summary?: string;
  image?: { url: string };
  primary_venue?: {
    name: string;
    address?: {
      address_1?: string;
      city?: string;
      postal_code?: string;
      latitude?: string;
      longitude?: string;
    };
  };
  tags?: Array<{ display_name: string }>;
  ticket_availability?: {
    minimum_ticket_price?: { major_value: string; currency: string };
    is_free?: boolean;
  };
}

function mapCategory(tags: Array<{ display_name: string }>): EventCategory {
  const names = tags.map(t => t.display_name.toLowerCase());
  if (names.some(n => n.includes('music') || n.includes('concert') || n.includes('gig')))
    return 'live-music';
  if (names.some(n => n.includes('comedy'))) return 'theatre-comedy';
  if (names.some(n => n.includes('theatre') || n.includes('theater') || n.includes('performing')))
    return 'theatre-comedy';
  if (names.some(n => n.includes('festival'))) return 'festival';
  if (names.some(n => n.includes('fitness') || n.includes('yoga') || n.includes('exercise')))
    return 'fitness-class';
  if (names.some(n => n.includes('sport'))) return 'sport';
  if (names.some(n => n.includes('family') || n.includes('kids') || n.includes('children')))
    return 'kids';
  if (names.some(n => n.includes('community') || n.includes('charity') || n.includes('volunteer')))
    return 'community';
  if (names.some(n => n.includes('food') || n.includes('drink') || n.includes('nightlife')))
    return 'pub-bar';
  if (names.some(n => n.includes('faith') || n.includes('religious') || n.includes('church')))
    return 'church-faith';
  return 'other';
}

function parseEvent(ev: EventbriteEvent): CmEvent | null {
  const startDate = new Date(`${ev.start_date}T${ev.start_time || '00:00'}`);
  if (isNaN(startDate.getTime())) return null;

  let endDate: Date | null = null;
  if (ev.end_date && ev.end_time) {
    endDate = new Date(`${ev.end_date}T${ev.end_time}`);
    if (isNaN(endDate.getTime())) endDate = null;
  }

  const venue = ev.primary_venue;
  const addr = venue?.address;
  const addressParts = [addr?.address_1, addr?.city, addr?.postal_code].filter(Boolean);

  const ta = ev.ticket_availability;
  const price = normalisePrice(ta?.minimum_ticket_price?.major_value, ta?.is_free);

  return {
    id: makeEventId('eventbrite', ev.id),
    title: ev.name.trim(),
    description: ev.summary?.slice(0, 300) ?? '',
    startDate,
    endDate,
    venue: venue?.name ?? 'Chelmsford',
    address: addressParts.join(', '),
    category: mapCategory(ev.tags ?? []),
    source: 'eventbrite',
    sourceUrl: ev.url,
    latitude: safeParseFloat(addr?.latitude),
    longitude: safeParseFloat(addr?.longitude),
    imageUrl: ev.image?.url ?? null,
    price,
    promoter: null,
  };
}

export const eventbriteFetcher: Fetcher = {
  name: 'eventbrite',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const events: CmEvent[] = [];

    const MAX_PAGES = 10;

    try {
      for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
        const url = pageNum === 1 ? SEARCH_URL : `${SEARCH_URL}?page=${pageNum}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        let html = '';

        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'CmOut/0.1 (Chelmsford Events Aggregator)',
              Accept: 'text/html',
            },
            signal: controller.signal,
          });

          if (!res.ok) {
            clearTimeout(timer);
            errors.push(`Eventbrite: HTTP ${res.status} on page ${pageNum}`);
            break;
          }

          html = await res.text();
          clearTimeout(timer);
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }

        // Extract window.__SERVER_DATA__ JSON by finding the assignment and the closing </script> tag
        const marker = 'window.__SERVER_DATA__ = ';
        const startIdx = html.indexOf(marker);
        if (startIdx === -1) {
          if (pageNum === 1) errors.push('Eventbrite: no __SERVER_DATA__ found in page');
          break;
        }
        const jsonStart = startIdx + marker.length;
        const scriptEnd = html.indexOf('</script>', jsonStart);
        if (scriptEnd === -1) {
          if (pageNum === 1) errors.push('Eventbrite: no closing </script> after __SERVER_DATA__');
          break;
        }
        // Trim trailing semicolons/whitespace before parsing
        const jsonStr = html.slice(jsonStart, scriptEnd).replace(/;\s*$/, '');

        const serverData = JSON.parse(jsonStr);

        // Navigate to events array - try known paths
        const results: EventbriteEvent[] =
          serverData?.search_data?.events?.results ?? serverData?.jsonld_data?.events ?? [];

        if (results.length === 0) {
          if (pageNum === 1) errors.push('Eventbrite: no events found in __SERVER_DATA__');
          break;
        }

        for (const ev of results) {
          const parsed = parseEvent(ev);
          if (parsed) events.push(parsed);
        }
      }
    } catch (err) {
      errors.push(`Eventbrite fetch error: ${(err as Error).message}`);
    }

    return {
      source: 'eventbrite',
      events,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
