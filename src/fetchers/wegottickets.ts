import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import type { CmEvent, FetchResult, Fetcher } from '../types.js';
import { makeEventId } from '../utils.js';

/**
 * WeGotTickets scraper for Black Frog Presents events.
 * HTML scraping with cheerio — no API available.
 */

const DEFAULT_URL = 'https://www.wegottickets.com/BlackFrogPresents';
const MAX_PAGES = 10;

/** Known Chelmsford venue coordinates */
const VENUE_COORDS: Record<string, { lat: number; lng: number }> = {
  'chelmsford social club': { lat: 51.7361, lng: 0.4784 },
  'hot box': { lat: 51.736, lng: 0.4672 },
};

function lookupCoords(venue: string): { lat: number; lng: number } | null {
  const lower = venue.toLowerCase();
  for (const [key, coords] of Object.entries(VENUE_COORDS)) {
    if (lower.includes(key)) return coords;
  }
  return null;
}

/**
 * Parse venue string like "CHELMSFORD: Black Frog Presents at Chelmsford Social Club"
 * into just the venue name after "at ".
 */
function parseVenue(raw: string): string {
  const atIdx = raw.lastIndexOf(' at ');
  if (atIdx !== -1) return raw.slice(atIdx + 4).trim();
  // Fallback: strip "CITY: " prefix
  const colonIdx = raw.indexOf(':');
  if (colonIdx !== -1) return raw.slice(colonIdx + 1).trim();
  return raw.trim();
}

/**
 * Parse date string like "Friday 17th April, 2026" into a Date.
 */
function parseDate(dateStr: string, timeStr: string): Date | null {
  // Strip ordinal suffixes: 17th -> 17
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/i, '$1');
  const base = new Date(cleaned);
  if (isNaN(base.getTime())) return null;

  // Extract start time (prefer start time over door time)
  const startMatch = timeStr.match(/start time:\s*(\d+):(\d+)(am|pm)/i);
  const doorMatch = timeStr.match(/door time:\s*(\d+):(\d+)(am|pm)/i);
  const match = startMatch ?? doorMatch;

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toLowerCase();
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    base.setHours(hours, minutes, 0, 0);
  }

  return base;
}

function parseEventBlock($: cheerio.CheerioAPI, el: Element): CmEvent | null {
  const $el = $(el);

  const titleEl = $el.find('h2 a.event_link');
  const title = titleEl.text().trim();
  const sourceUrl = titleEl.attr('href') ?? '';
  if (!title || !sourceUrl) return null;

  const venueRaw =
    $el.find('table.venue-details th[title="Location"]').next('td').text().trim() ?? '';
  const dateStr = $el.find('table.venue-details th[title="Date"]').next('td').text().trim() ?? '';
  const timeStr = $el.find('table.venue-details th[title="Time"]').next('td').text().trim() ?? '';

  const startDate = parseDate(dateStr, timeStr);
  if (!startDate) return null;

  const venue = parseVenue(venueRaw);
  const coords = lookupCoords(venue);
  const imageUrl = $el.find('.event-thumbnail-wrapper img').attr('src') ?? null;

  return {
    id: makeEventId('wegottickets', sourceUrl),
    title,
    description: '',
    startDate,
    endDate: null,
    venue,
    address: venueRaw,
    category: 'live-music',
    source: 'wegottickets',
    sourceUrl,
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    imageUrl,
    price: null,
  };
}

async function fetchPage(
  url: string,
  errors: string[]
): Promise<{ events: CmEvent[]; nextUrl: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CmOut/0.1 (Chelmsford Events Aggregator)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      errors.push(`WeGotTickets ${url}: HTTP ${res.status}`);
      return { events: [], nextUrl: null };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const events: CmEvent[] = [];
    $('div.chatterbox-margin.flex').each((_, el) => {
      const ev = parseEventBlock($, el);
      if (ev) events.push(ev);
    });

    const nextLink = $('a.nextlink').attr('href') ?? null;

    return { events, nextUrl: nextLink };
  } catch (err) {
    clearTimeout(timer);
    errors.push(`WeGotTickets fetch error: ${(err as Error).message}`);
    return { events: [], nextUrl: null };
  }
}

export const wegotticketsFetcher: Fetcher = {
  name: 'wegottickets',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const allEvents: CmEvent[] = [];

    const baseUrl = process.env.WEGOTTICKETS_URL ?? DEFAULT_URL;
    let url: string | null = baseUrl;
    let page = 0;

    while (url && page < MAX_PAGES) {
      const result = await fetchPage(url, errors);
      allEvents.push(...result.events);
      url = result.nextUrl;
      page++;
    }

    if (allEvents.length === 0 && errors.length === 0) {
      errors.push('WeGotTickets: 0 events parsed — selectors may need updating');
    }

    return {
      source: 'wegottickets',
      events: allEvents,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
