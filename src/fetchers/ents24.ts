import type { CmEvent, FetchResult, Fetcher, EventCategory } from '../types.js';
import { makeEventId, normalisePrice } from '../utils.js';

const BASE_URL = 'https://api.ents24.com/event/list';
const AUTH_URL = 'https://api.ents24.com/auth/token';

interface Ents24Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  venue: {
    id: string;
    name: string;
    town?: string;
    postcode?: string;
    location?: { lat: number; lng: number };
  };
  genre?: { name: string }[];
  webLink: string;
  image?: { url: string }[];
  price?: string;
}

interface Ents24ListResponse {
  data?: Ents24Event[];
  // The API may also return an array directly
}

function mapGenreToCategory(genres: { name: string }[]): EventCategory {
  const names = genres.map(g => g.name.toLowerCase());
  if (names.some(n => /music|gig|concert|dj|band|singer/.test(n))) return 'live-music';
  if (names.some(n => /comedy|standup|stand-up/.test(n))) return 'theatre-comedy';
  if (names.some(n => /theatre|theater|drama|musical|opera|ballet/.test(n)))
    return 'theatre-comedy';
  if (names.some(n => /festival/.test(n))) return 'festival';
  if (names.some(n => /sport/.test(n))) return 'sport';
  if (names.some(n => /kids|children|family/.test(n))) return 'kids';
  return 'other';
}

function parseEnts24Event(ev: Ents24Event): CmEvent | null {
  const startDate = new Date(ev.startDate);
  if (isNaN(startDate.getTime())) return null;

  const endDate = ev.endDate ? new Date(ev.endDate) : null;

  return {
    id: makeEventId('ents24', ev.id),
    title: ev.title,
    description: ev.description ?? '',
    startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    venue: ev.venue.name,
    address: [ev.venue.town, ev.venue.postcode].filter(Boolean).join(', '),
    category: mapGenreToCategory(ev.genre ?? []),
    source: 'ents24',
    sourceUrl: ev.webLink ?? '',
    latitude: ev.venue.location?.lat ?? null,
    longitude: ev.venue.location?.lng ?? null,
    imageUrl: ev.image?.[0]?.url ?? null,
    price: normalisePrice(ev.price),
    promoter: null,
  };
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Ents24 auth failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export const ents24Fetcher: Fetcher = {
  name: 'ents24',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const events: CmEvent[] = [];

    const clientId = process.env.ENTS24_CLIENT_ID;
    const clientSecret = process.env.ENTS24_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        source: 'ents24',
        events: [],
        errors: ['ENTS24_CLIENT_ID and/or ENTS24_CLIENT_SECRET not set in .env'],
        fetchedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }

    const MAX_PAGES = 10;
    const RESULTS_PER_PAGE = 50;

    try {
      const token = await getAccessToken(clientId, clientSecret);

      const params = new URLSearchParams({
        location: 'name:Chelmsford',
        results_per_page: String(RESULTS_PER_PAGE),
        incl_image: 'true',
      });

      let page = 1;

      while (page <= MAX_PAGES) {
        params.set('page', String(page));
        const res = await fetch(`${BASE_URL}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // 404 on page > 1 means we've passed the last page; treat as end of results
          if (res.status === 404 && page > 1) break;
          throw new Error(`Ents24 API: HTTP ${res.status}`);
        }

        const data = (await res.json()) as Ents24Event[] | Ents24ListResponse;
        const eventList = Array.isArray(data) ? data : (data.data ?? []);

        if (eventList.length === 0) break;

        for (const ev of eventList) {
          const parsed = parseEnts24Event(ev);
          if (parsed) events.push(parsed);
        }

        page++;
        if (eventList.length < RESULTS_PER_PAGE) break;
      }
    } catch (err) {
      errors.push(`Ents24 fetch error: ${(err as Error).message}`);
    }

    return {
      source: 'ents24',
      events,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
