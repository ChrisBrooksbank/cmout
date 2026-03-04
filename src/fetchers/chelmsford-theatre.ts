import * as cheerio from 'cheerio';
import type { CmEvent, EventCategory, FetchResult, Fetcher } from '../types.js';
import { makeEventId, normalisePrice } from '../utils.js';

/**
 * Chelmsford Theatre scraper.
 * Scrapes chelmsfordtheatre.co.uk for events at the main Chelmsford Theatre.
 * HTML scraping with cheerio — no API key needed.
 */

const BASE_URL = 'https://www.chelmsfordtheatre.co.uk';
const LISTING_URL = `${BASE_URL}/whats-on`;
const VENUE = 'Chelmsford Theatre';
const ADDRESS = 'Fairfield Road, Chelmsford, Essex CM1 1JG';
const LAT = 51.7361;
const LNG = 0.4723;
const CONCURRENCY = 3;

/** Map website genre strings to our EventCategory. */
export function genreToCategory(genre: string): EventCategory {
  const g = genre.toLowerCase().trim();
  if (/music|concert|gig|musical/i.test(g)) return 'live-music';
  if (/drama|play|theatre|comedy|pantomime|panto/i.test(g)) return 'theatre-comedy';
  if (/kids|children|family/i.test(g)) return 'kids';
  if (/community|talk|lecture/i.test(g)) return 'community';
  if (/festival/i.test(g)) return 'festival';
  if (/sport|boxing|wrestling|darts/i.test(g)) return 'sport';
  return 'other';
}

async function fetchPage(url: string): Promise<string> {
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
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

interface ListingItem {
  slug: string;
  url: string;
}

/** Scrape a single listing page and return event slugs/URLs. */
function extractListingItems(html: string): ListingItem[] {
  const $ = cheerio.load(html);
  const items: ListingItem[] = [];
  const seen = new Set<string>();

  $('a[href^="/event/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const slug = href.replace(/^\/event\//, '').replace(/\/$/, '');
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    items.push({ slug, url: `${BASE_URL}${href}` });
  });

  return items;
}

/** Fetch all listing pages and collect event URLs. */
async function getAllListingItems(errors: string[]): Promise<ListingItem[]> {
  const allItems: ListingItem[] = [];
  const seen = new Set<string>();

  // First page is /whats-on, subsequent are /events/page:N
  const pageUrls = [
    LISTING_URL,
    `${BASE_URL}/events/page:2`,
    `${BASE_URL}/events/page:3`,
    `${BASE_URL}/events/page:4`,
    `${BASE_URL}/events/page:5`,
  ];

  for (const pageUrl of pageUrls) {
    try {
      const html = await fetchPage(pageUrl);
      const items = extractListingItems(html);

      if (items.length === 0) break; // No more events, stop pagination

      for (const item of items) {
        if (!seen.has(item.slug)) {
          seen.add(item.slug);
          allItems.push(item);
        }
      }
    } catch (err) {
      errors.push(`Chelmsford Theatre listing page error (${pageUrl}): ${(err as Error).message}`);
    }
  }

  return allItems;
}

export interface DetailInfo {
  title: string;
  performances: { date: string; time: string }[]; // date="Wed 4 Mar 2026", time="14:30"
  price: string | null;
  description: string;
  imageUrl: string | null;
  genre: string | null;
  sourceUrl: string;
}

/** Parse a detail page HTML into structured info. */
export function parseDetailPage(html: string, sourceUrl: string): DetailInfo | null {
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  if (!title) return null;

  // Performances: <h4>Wed 4 Mar 2026</h4> followed by <a>14:30 - Tickets Available</a>
  const performances: { date: string; time: string }[] = [];
  $('h4').each((_, el) => {
    const dateText = $(el).text().trim();
    // Match "Wed 4 Mar 2026" or similar day-of-week date patterns
    if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d/i.test(dateText)) return;

    // Find sibling <a> elements with performance times
    let next = $(el).next();
    while (next.length && next.is('a')) {
      const linkText = next.text().trim();
      const timeMatch = linkText.match(/^(\d{1,2}:\d{2})/);
      if (timeMatch) {
        performances.push({ date: dateText, time: timeMatch[1] });
      }
      next = next.next();
    }
  });

  // Price: "Tickets: £10.00 - £46.50"
  let price: string | null = null;
  const priceEl = $('strong')
    .filter((_, el) => /tickets/i.test($(el).text()))
    .first();
  if (priceEl.length) {
    const priceText = priceEl
      .parent()
      .text()
      .replace(/tickets:\s*/i, '')
      .trim();
    price = normalisePrice(priceText);
  }

  // Description: content paragraphs (skip short/boilerplate ones)
  const descParts: string[] = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (
      text.length > 40 &&
      !/tickets|book now|click here|running time|age guidance|genre|captioned|audio described/i.test(
        text
      )
    ) {
      descParts.push(text);
    }
  });
  const description = descParts.slice(0, 3).join(' ');

  // Image: main hero image
  let imageUrl: string | null = null;
  const imgEl = $('img[src*="/media/"]').first();
  if (imgEl.length) {
    const src = imgEl.attr('src') ?? '';
    imageUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
  }

  // Genre
  let genre: string | null = null;
  const genreEl = $('strong')
    .filter((_, el) => /genre/i.test($(el).text()))
    .first();
  if (genreEl.length) {
    genre = genreEl
      .parent()
      .text()
      .replace(/genre:\s*/i, '')
      .trim();
  }

  return { title, performances, price, description, imageUrl, genre, sourceUrl };
}

/** Convert a DetailInfo into CmEvent[] — one per performance. */
export function detailToEvents(detail: DetailInfo): CmEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const category = detail.genre ? genreToCategory(detail.genre) : 'other';
  const events: CmEvent[] = [];

  for (const perf of detail.performances) {
    // Parse "Wed 4 Mar 2026" + "14:30"
    const startDate = parsePerformanceDateTime(perf.date, perf.time);
    if (!startDate || startDate < now) continue;

    events.push({
      id: makeEventId('chelmsford-theatre', detail.title, startDate.toISOString()),
      title: detail.title,
      description: detail.description,
      startDate,
      endDate: null,
      venue: VENUE,
      address: ADDRESS,
      category,
      source: 'chelmsford-theatre',
      sourceUrl: detail.sourceUrl,
      latitude: LAT,
      longitude: LNG,
      imageUrl: detail.imageUrl,
      price: detail.price,
      promoter: 'Chelmsford Theatre',
    });
  }

  return events;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Parse "Wed 4 Mar 2026" + "14:30" into a Date. */
export function parsePerformanceDateTime(dateStr: string, timeStr: string): Date | null {
  // "Wed 4 Mar 2026" → day=4, month=Mar, year=2026
  const dateMatch = dateStr.match(/\w+\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/);
  if (!dateMatch) return null;

  const day = parseInt(dateMatch[1], 10);
  const month = MONTH_MAP[dateMatch[2].toLowerCase()];
  const year = parseInt(dateMatch[3], 10);
  if (month === undefined) return null;

  // "14:30" → hours=14, minutes=30
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  return new Date(year, month, day, hours, minutes, 0, 0);
}

/** Process detail pages in batches of CONCURRENCY. */
async function fetchDetailsBatched(items: ListingItem[], errors: string[]): Promise<DetailInfo[]> {
  const details: DetailInfo[] = [];

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async item => {
        const html = await fetchPage(item.url);
        return parseDetailPage(html, item.url);
      })
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled' && result.value) {
        details.push(result.value);
      } else if (result.status === 'rejected') {
        errors.push(`Chelmsford Theatre detail error (${batch[j].url}): ${result.reason}`);
      }
    }
  }

  return details;
}

export const chelmsfordTheatreFetcher: Fetcher = {
  name: 'chelmsford-theatre',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];

    const items = await getAllListingItems(errors);

    if (items.length === 0) {
      errors.push('Chelmsford Theatre: No event URLs found');
      return {
        source: 'chelmsford-theatre',
        events: [],
        errors,
        fetchedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }

    const details = await fetchDetailsBatched(items, errors);
    const events = details.flatMap(d => detailToEvents(d));

    return {
      source: 'chelmsford-theatre',
      events,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
