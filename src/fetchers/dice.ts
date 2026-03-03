import type { CmEvent, FetchResult, Fetcher, EventCategory } from '../types.js';
import { makeEventId, normalisePrice } from '../utils.js';

/**
 * DICE venue page scraper.
 * Extracts event data from __NEXT_DATA__ JSON embedded in the venue page HTML.
 * No API key required.
 */

const VENUE_URLS = [
  'https://dice.fm/venue/hot-box-r7wq?lng=en',
  // Add more DICE venue pages here if needed
];

interface DiceEvent {
  id: string;
  name: string;
  perm_name: string;
  date_unix: number;
  dates: {
    event_start_date: string;
    event_end_date: string | null;
    timezone: string;
  };
  venues: Array<{
    name: string;
    address: string;
    location: { lat: number; lng: number };
  }>;
  price: {
    currency: string;
    amount: number; // in pence
    amount_from: number | null;
  };
  tags_types: Array<{ name: string; value: string; title: string }>;
  images: {
    square?: string;
    landscape?: string;
    portrait?: string;
  };
  about?: {
    description?: string;
  };
  status: string;
}

function mapDiceCategory(tags: DiceEvent['tags_types']): EventCategory {
  const values = tags.map(t => t.value.toLowerCase());
  if (values.some(v => v.includes('music') || v.includes('gig') || v.includes('concert')))
    return 'live-music';
  if (values.some(v => v.includes('comedy'))) return 'theatre-comedy';
  if (values.some(v => v.includes('theatre') || v.includes('theater'))) return 'theatre-comedy';
  if (values.some(v => v.includes('club') || v.includes('dj'))) return 'pub-bar';
  if (values.some(v => v.includes('festival'))) return 'festival';
  if (values.some(v => v.includes('family') || v.includes('kids'))) return 'kids';
  if (values.some(v => v.includes('community'))) return 'community';
  return 'other';
}

function parseDiceEvent(ev: DiceEvent): CmEvent | null {
  if (ev.status !== 'on-sale' && ev.status !== 'sold-out') return null;

  const startDate = new Date(ev.dates.event_start_date);
  if (isNaN(startDate.getTime())) return null;

  const endDate = ev.dates.event_end_date ? new Date(ev.dates.event_end_date) : null;

  const venue = ev.venues[0];
  const priceAmount = ev.price.amount_from ?? ev.price.amount;
  const price = normalisePrice(priceAmount / 100);

  return {
    id: makeEventId('dice', ev.id),
    title: ev.name.trim(),
    description: ev.about?.description?.slice(0, 300) ?? '',
    startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    venue: venue?.name ?? 'Unknown venue',
    address: venue?.address ?? '',
    category: mapDiceCategory(ev.tags_types ?? []),
    source: 'dice' as CmEvent['source'],
    sourceUrl: `https://dice.fm/event/${ev.perm_name}`,
    latitude: venue?.location?.lat ?? null,
    longitude: venue?.location?.lng ?? null,
    imageUrl: ev.images?.landscape ?? ev.images?.square ?? null,
    price,
    promoter: null,
  };
}

async function fetchVenuePage(url: string, errors: string[]): Promise<CmEvent[]> {
  const events: CmEvent[] = [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CmOut/0.1 (Chelmsford Events Aggregator)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      errors.push(`DICE page ${url}: HTTP ${res.status}`);
      return events;
    }

    const html = await res.text();

    // Extract __NEXT_DATA__ JSON
    const match = html.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      errors.push(`DICE page ${url}: no __NEXT_DATA__ found`);
      return events;
    }

    const data = JSON.parse(match[1]);
    const sections = data?.props?.pageProps?.profile?.sections ?? [];

    for (const section of sections) {
      const sectionEvents = section.events ?? [];
      for (const ev of sectionEvents) {
        const parsed = parseDiceEvent(ev as DiceEvent);
        if (parsed) events.push(parsed);
      }
    }
  } catch (err) {
    errors.push(`DICE fetch error: ${(err as Error).message}`);
  }

  return events;
}

export const diceFetcher: Fetcher = {
  name: 'dice' as Fetcher['name'],
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const allEvents: CmEvent[] = [];

    const results = await Promise.allSettled(VENUE_URLS.map(url => fetchVenuePage(url, errors)));

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);
      } else {
        errors.push(`DICE venue page failed: ${result.reason}`);
      }
    }

    return {
      source: 'dice' as FetchResult['source'],
      events: allEvents,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
