import type { CmEvent, FetchResult, Fetcher, EventCategory } from '../types.js';
import {
  makeEventId,
  fetchJson,
  normalisePrice,
  CHELMSFORD_LAT,
  CHELMSFORD_LNG,
  DEFAULT_RADIUS_MILES,
} from '../utils.js';

/**
 * Outsavvy API fetcher.
 * Covers fitness classes, yoga, markets, workshops, and community events —
 * a different demographic to the commercial ticketing platforms.
 * Requires OUTSAVVY_API_KEY (obtain via partners.outsavvy.com/developer).
 */

const BASE_URL = 'https://api.outsavvy.com/v1';

interface OutsavvyDate {
  id: number;
  timezone: string;
  startlocal: string;
  startutc: string;
  endlocal: string | null;
  endutc: string | null;
  active: boolean;
  event_date_description: string | null;
}

interface OutsavvyEvent {
  id: number;
  is_online: string; // 'true' or 'false' as string
  name: string;
  description: string;
  line_up: string | null;
  url: string;
  dates: OutsavvyDate[];
  organiser_id: number;
  status: string; // 'live' | 'inactive' | 'past_event' | 'private'
  image_url: string | null;
  image_url_large: string | null;
  latitude: string | null;
  longitude: string | null;
  location_name: string | null;
  address_1: string | null;
  address_2: string | null;
  address_3: string | null;
  address_town: string | null;
  address_postcode: string | null;
  price: string | null;
}

interface OutsavvyResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: OutsavvyEvent[];
}

function mapCategory(name: string, description: string): EventCategory {
  const text = `${name} ${description}`.toLowerCase();
  if (/\byoga\b|pilates|zumba|aerobics|barre/.test(text)) return 'fitness-class';
  if (/fitness|gym|workout|exercise|run|walk|swim|cycle|bootcamp|hiit/.test(text))
    return 'fitness-class';
  if (/music|gig|concert|band|live act/.test(text)) return 'live-music';
  if (/comedy|theatre|theater|drama|pantomime|cabaret/.test(text)) return 'theatre-comedy';
  if (/festival|fair|fete|carnival/.test(text)) return 'festival';
  if (/kids|children|family|baby|toddler|nursery/.test(text)) return 'kids';
  if (/church|faith|prayer|worship|spiritual|meditation/.test(text)) return 'church-faith';
  if (/sport|cricket|football|rugby|tennis|netball|golf/.test(text)) return 'sport';
  if (/market|craft|artisan|food.*stall/.test(text)) return 'community';
  if (/community|meetup|social|network|volunteer|talk|workshop|class/.test(text))
    return 'community';
  if (/pub|bar|club|nightlife/.test(text)) return 'pub-bar';
  return 'other';
}

function parseEvent(ev: OutsavvyEvent, date: OutsavvyDate): CmEvent {
  const startDate = new Date(date.startlocal);
  const endDate = date.endlocal ? new Date(date.endlocal) : null;

  const address = [ev.address_1, ev.address_2, ev.address_3, ev.address_town, ev.address_postcode]
    .filter(Boolean)
    .join(', ');

  return {
    id: makeEventId('outsavvy', String(ev.id), String(date.id)),
    title: ev.name.trim(),
    description: (ev.description ?? '').replace(/<[^>]+>/g, '').slice(0, 300),
    startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    venue: ev.location_name ?? ev.address_town ?? 'Unknown venue',
    address,
    category: mapCategory(ev.name, ev.description ?? ''),
    source: 'outsavvy',
    sourceUrl: ev.url,
    latitude: ev.latitude ? parseFloat(ev.latitude) : null,
    longitude: ev.longitude ? parseFloat(ev.longitude) : null,
    imageUrl: ev.image_url_large ?? ev.image_url ?? null,
    price: normalisePrice(ev.price),
    promoter: null,
  };
}

export const outsavvyFetcher: Fetcher = {
  name: 'outsavvy',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const events: CmEvent[] = [];

    const apiKey = process.env.OUTSAVVY_API_KEY;
    if (!apiKey) {
      return {
        source: 'outsavvy',
        events: [],
        errors: ['OUTSAVVY_API_KEY not set in .env'],
        fetchedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }

    const MAX_PAGES = 10;
    const now = new Date();

    try {
      const params = new URLSearchParams({
        latitude: String(CHELMSFORD_LAT),
        longitude: String(CHELMSFORD_LNG),
        range: String(DEFAULT_RADIUS_MILES),
        start_date: now.toISOString(),
      });

      let nextUrl: string | null = `${BASE_URL}/events/search/?${params}`;
      let page = 0;

      while (nextUrl && page < MAX_PAGES) {
        const currentUrl = nextUrl;
        const data: OutsavvyResponse = await fetchJson<OutsavvyResponse>(currentUrl, {
          headers: {
            Authorization: `Partner ${apiKey}`,
            Accept: 'application/json',
          },
        });

        for (const ev of data.results ?? []) {
          if (ev.status !== 'live') continue;
          if (ev.is_online === 'true') continue;

          for (const date of ev.dates ?? []) {
            if (!date.active) continue;
            const startDate = new Date(date.startlocal);
            if (isNaN(startDate.getTime()) || startDate < now) continue;
            events.push(parseEvent(ev, date));
          }
        }

        nextUrl = data.next ?? null;
        page++;
      }
    } catch (err) {
      errors.push(`Outsavvy fetch error: ${(err as Error).message}`);
    }

    return {
      source: 'outsavvy',
      events,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
