import type { CmEvent, FetchResult, Fetcher, EventCategory } from '../types.js';
import {
  makeEventId,
  fetchJson,
  normalisePrice,
  CHELMSFORD_LAT,
  CHELMSFORD_LNG,
  DEFAULT_RADIUS_MILES,
} from '../utils.js';

const BASE_URL = 'https://www.skiddle.com/api/v1/events/search/';

interface SkiddleEvent {
  id: number;
  eventname: string;
  description: string;
  date: string; // YYYY-MM-DD
  openingtimes: { doorsopen?: string; doorsclose?: string };
  venue: {
    id: number;
    name: string;
    address: string;
    town: string;
    postcode: string;
    latitude: number;
    longitude: number;
  };
  EventCode: string; // LIVE, CLUB, FEST, COMEDY, THEATRE, etc.
  entryprice: string;
  link: string;
  largeimageurl?: string;
  imageurl?: string;
  starttime?: string;
  endtime?: string;
}

interface SkiddleResponse {
  results: SkiddleEvent[];
  totalcount: string;
  pagecount: string;
  error?: number;
  errormessage?: string;
}

function mapCategory(code: string): EventCategory {
  switch (code) {
    case 'LIVE':
      return 'live-music';
    case 'CLUB':
      return 'pub-bar';
    case 'FEST':
      return 'festival';
    case 'COMEDY':
    case 'THEATRE':
      return 'theatre-comedy';
    case 'KIDS':
      return 'kids';
    case 'SPORT':
      return 'sport';
    default:
      return 'other';
  }
}

function parseSkiddleEvent(ev: SkiddleEvent): CmEvent {
  const startTime = ev.openingtimes?.doorsopen ?? ev.starttime ?? '00:00';
  const endTime = ev.openingtimes?.doorsclose ?? ev.endtime ?? null;

  const startDate = new Date(`${ev.date}T${startTime}`);
  const endDate = endTime ? new Date(`${ev.date}T${endTime}`) : null;

  return {
    id: makeEventId('skiddle', String(ev.id)),
    title: ev.eventname,
    description: ev.description ?? '',
    startDate,
    endDate,
    venue: ev.venue.name,
    address: [ev.venue.address, ev.venue.town, ev.venue.postcode].filter(Boolean).join(', '),
    category: mapCategory(ev.EventCode),
    source: 'skiddle',
    sourceUrl: ev.link,
    latitude: ev.venue.latitude,
    longitude: ev.venue.longitude,
    imageUrl: ev.largeimageurl ?? ev.imageurl ?? null,
    price: normalisePrice(ev.entryprice),
    promoter: null,
  };
}

export const skiddleFetcher: Fetcher = {
  name: 'skiddle',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const events: CmEvent[] = [];

    const apiKey = process.env.SKIDDLE_API_KEY;
    if (!apiKey) {
      return {
        source: 'skiddle',
        events: [],
        errors: ['SKIDDLE_API_KEY not set in .env'],
        fetchedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }

    const MAX_PAGES = 10;
    const LIMIT = 100;

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        latitude: String(CHELMSFORD_LAT),
        longitude: String(CHELMSFORD_LNG),
        radius: String(DEFAULT_RADIUS_MILES),
        limit: String(LIMIT),
      });

      let offset = 0;
      let totalPages = 1;
      let page = 0;

      while (page < totalPages && page < MAX_PAGES) {
        params.set('offset', String(offset));
        const data = await fetchJson<SkiddleResponse>(`${BASE_URL}?${params}`);

        if (data.error) {
          errors.push(`Skiddle API error: ${data.errormessage}`);
          break;
        }

        const results = data.results ?? [];
        for (const ev of results) {
          events.push(parseSkiddleEvent(ev));
        }

        totalPages = parseInt(data.pagecount, 10) || 1;
        offset += LIMIT;
        page++;

        if (results.length < LIMIT) break;
      }
    } catch (err) {
      errors.push(`Skiddle fetch error: ${(err as Error).message}`);
    }

    return {
      source: 'skiddle',
      events,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
