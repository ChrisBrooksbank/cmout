import type { CmEvent, FetchResult, Fetcher, EventCategory } from '../types.js';
import {
  makeEventId,
  fetchJson,
  safeParseFloat,
  normalisePrice,
  CHELMSFORD_LAT,
  CHELMSFORD_LNG,
  DEFAULT_RADIUS_MILES,
} from '../utils.js';

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

interface TmEvent {
  id: string;
  name: string;
  url: string;
  info?: string;
  pleaseNote?: string;
  dates: {
    start: { localDate: string; localTime?: string };
    end?: { localDate?: string; localTime?: string };
  };
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      address?: { line1: string };
      city?: { name: string };
      postalCode?: string;
      location?: { latitude: string; longitude: string };
    }>;
  };
  images?: Array<{ url: string; width: number; height: number }>;
  priceRanges?: Array<{ min: number; max: number; currency: string }>;
}

interface TmResponse {
  _embedded?: { events: TmEvent[] };
  page?: { totalElements: number; totalPages: number };
}

function mapTmCategory(classifications: TmEvent['classifications']): EventCategory {
  if (!classifications?.length) return 'other';
  const segment = classifications[0].segment?.name?.toLowerCase() ?? '';
  const genre = classifications[0].genre?.name?.toLowerCase() ?? '';

  if (segment === 'music') return 'live-music';
  if (segment === 'sports') return 'sport';
  if (segment === 'arts & theatre') {
    if (genre.includes('comedy')) return 'theatre-comedy';
    return 'theatre-comedy';
  }
  if (genre.includes('festival')) return 'festival';
  if (genre.includes('family') || genre.includes('children')) return 'kids';
  return 'other';
}

function parseTmEvent(ev: TmEvent): CmEvent | null {
  const venue = ev._embedded?.venues?.[0];
  const startDate = new Date(
    `${ev.dates.start.localDate}T${ev.dates.start.localTime ?? '00:00:00'}`
  );
  if (isNaN(startDate.getTime())) return null;

  const endDate = ev.dates.end?.localDate
    ? new Date(`${ev.dates.end.localDate}T${ev.dates.end.localTime ?? '23:59:59'}`)
    : null;

  const priceRange = ev.priceRanges?.[0];
  const price = priceRange
    ? normalisePrice(
        priceRange.min === priceRange.max ? priceRange.min : `${priceRange.min}-${priceRange.max}`
      )
    : null;

  // Pick best image (prefer ~600px wide)
  const image = ev.images?.sort((a, b) => Math.abs(a.width - 600) - Math.abs(b.width - 600))?.[0];

  return {
    id: makeEventId('ticketmaster', ev.id),
    title: ev.name,
    description: ev.info ?? ev.pleaseNote ?? '',
    startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    venue: venue?.name ?? 'Unknown venue',
    address: [venue?.address?.line1, venue?.city?.name, venue?.postalCode]
      .filter(Boolean)
      .join(', '),
    category: mapTmCategory(ev.classifications),
    source: 'ticketmaster',
    sourceUrl: ev.url,
    latitude: safeParseFloat(venue?.location?.latitude),
    longitude: safeParseFloat(venue?.location?.longitude),
    imageUrl: image?.url ?? null,
    price,
  };
}

export const ticketmasterFetcher: Fetcher = {
  name: 'ticketmaster',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const events: CmEvent[] = [];

    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      return {
        source: 'ticketmaster',
        events: [],
        errors: ['TICKETMASTER_API_KEY not set in .env'],
        fetchedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }

    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        latlong: `${CHELMSFORD_LAT},${CHELMSFORD_LNG}`,
        radius: String(DEFAULT_RADIUS_MILES),
        unit: 'miles',
        countryCode: 'GB',
        size: '100',
        sort: 'date,asc',
      });

      const url = `${BASE_URL}?${params}`;
      const data = await fetchJson<TmResponse>(url);

      const tmEvents = data._embedded?.events ?? [];
      for (const ev of tmEvents) {
        const parsed = parseTmEvent(ev);
        if (parsed) events.push(parsed);
      }
    } catch (err) {
      errors.push(`Ticketmaster fetch error: ${(err as Error).message}`);
    }

    return {
      source: 'ticketmaster',
      events,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
