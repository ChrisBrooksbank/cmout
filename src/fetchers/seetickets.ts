import * as cheerio from 'cheerio';
import type { CmEvent, EventCategory, FetchResult, Fetcher } from '../types.js';
import { makeEventId, normalisePrice } from '../utils.js';

/**
 * See Tickets scraper.
 * Targets the Chelmsford town listing page and known Chelmsford venue pages.
 * Extracts JSON-LD Event schema data (primary) or falls back to HTML parsing.
 *
 * See Tickets does not have a public API — this uses HTML scraping with
 * browser-like headers. If the site starts returning 403, check the User-Agent
 * and consider adding additional headers.
 */

const TOWN_URL = 'https://www.seetickets.com/Town/chelmsford';

/** Known Chelmsford venue pages — covers events not listed on the town page */
const VENUE_URLS = [
  'https://www.seetickets.com/venue/hylands-park/170',
  'https://www.seetickets.com/venue/chelmsford-city-racecourse/10691',
  'https://www.seetickets.com/venue/central-park/17925',
];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
};

// ---------- JSON-LD extraction ----------

interface JsonLdEvent {
  '@type': string;
  name?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string | { url?: string };
  description?: string;
  location?: {
    '@type'?: string;
    name?: string;
    address?: string | { streetAddress?: string; addressLocality?: string; postalCode?: string };
    geo?: { latitude?: number | string; longitude?: number | string };
  };
  offers?:
    | {
        price?: string | number;
        priceCurrency?: string;
        availability?: string;
      }
    | Array<{ price?: string | number; priceCurrency?: string }>;
}

function extractJsonLdEvents(html: string): JsonLdEvent[] {
  const events: JsonLdEvent[] = [];
  const $ = cheerio.load(html);

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Event') events.push(item as JsonLdEvent);
        // ItemList wrapping multiple events
        if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
          for (const entry of item.itemListElement) {
            const inner = entry.item ?? entry;
            if (inner['@type'] === 'Event') events.push(inner as JsonLdEvent);
          }
        }
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  });

  return events;
}

function jsonLdEventToString(img: JsonLdEvent['image']): string | null {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return img.url ?? null;
}

function jsonLdAddress(loc: JsonLdEvent['location']): string {
  if (!loc) return '';
  const addr = loc.address;
  if (!addr) return loc.name ?? '';
  if (typeof addr === 'string') return addr;
  return [addr.streetAddress, addr.addressLocality, addr.postalCode].filter(Boolean).join(', ');
}

function jsonLdPrice(offers: JsonLdEvent['offers']): string | null {
  if (!offers) return null;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer) return null;
  const price = offer.price;
  if (price == null) return null;
  const currency = Array.isArray(offers) ? offers[0]?.priceCurrency : offers.priceCurrency;
  if (currency === 'GBP' || !currency) return normalisePrice(String(price));
  return String(price);
}

function mapCategory(name: string, description: string): EventCategory {
  const text = `${name} ${description}`.toLowerCase();
  if (/music|gig|concert|band|live act|tribute/.test(text)) return 'live-music';
  if (/comedy|theatre|theater|drama|pantomime|cabaret/.test(text)) return 'theatre-comedy';
  if (/festival|fair|fete|carnival/.test(text)) return 'festival';
  if (/race|racing|equestrian|horse/.test(text)) return 'sport';
  if (/kids|children|family|baby/.test(text)) return 'kids';
  if (/community|talk|lecture|workshop/.test(text)) return 'community';
  if (/fitness|run|walk|sport|golf|cricket|football/.test(text)) return 'sport';
  return 'other';
}

function parseJsonLdEvent(ev: JsonLdEvent, fallbackVenue?: string): CmEvent | null {
  if (!ev.name || !ev.startDate) return null;

  const startDate = new Date(ev.startDate);
  if (isNaN(startDate.getTime())) return null;

  const endDate = ev.endDate ? new Date(ev.endDate) : null;
  const loc = ev.location;
  const venue = loc?.name ?? fallbackVenue ?? 'Unknown venue';
  const address = jsonLdAddress(loc);

  const geo = loc?.geo;
  const latitude = geo?.latitude ? parseFloat(String(geo.latitude)) : null;
  const longitude = geo?.longitude ? parseFloat(String(geo.longitude)) : null;

  const url = ev.url ?? '';
  const imageUrl = jsonLdEventToString(ev.image);
  const price = jsonLdPrice(ev.offers);

  return {
    id: makeEventId('seetickets', url || ev.name, startDate.toISOString()),
    title: ev.name.trim(),
    description: ev.description?.slice(0, 300) ?? '',
    startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
    venue,
    address,
    category: mapCategory(ev.name, ev.description ?? ''),
    source: 'seetickets',
    sourceUrl: url,
    latitude,
    longitude,
    imageUrl,
    price,
    promoter: null,
  };
}

// ---------- HTML fallback ----------

/**
 * Fallback HTML parser for when JSON-LD is absent.
 * Targets seetickets.com listing page event cards.
 * Selectors verified against seetickets.com as of 2026-03 — may need updating.
 */
function parseHtmlEvents(html: string, pageUrl: string): CmEvent[] {
  const $ = cheerio.load(html);
  const events: CmEvent[] = [];

  // Each event card is an <li> or <article> with a link to /event/...
  $('a[href*="/event/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') ?? '';
    if (!href.includes('/event/')) return;

    const sourceUrl = href.startsWith('http') ? href : `https://www.seetickets.com${href}`;
    const title =
      $el.find('h2, h3, .event-title, [class*="title"]').first().text().trim() ||
      $el.text().trim().split('\n')[0]?.trim();

    if (!title || title.length < 3) return;

    // Date: look for a time element or date-formatted text
    const dateText = $el.find('time, [class*="date"], [class*="when"]').first().text().trim();
    const startDate = dateText ? new Date(dateText) : null;
    if (!startDate || isNaN(startDate.getTime())) return;

    const venue = $el.find('[class*="venue"], [class*="location"]').first().text().trim();
    const priceText = $el.find('[class*="price"], [class*="from"]').first().text().trim();

    events.push({
      id: makeEventId('seetickets', sourceUrl),
      title,
      description: '',
      startDate,
      endDate: null,
      venue: venue || 'Chelmsford',
      address: '',
      category: mapCategory(title, ''),
      source: 'seetickets',
      sourceUrl,
      latitude: null,
      longitude: null,
      imageUrl: $el.find('img').first().attr('src') ?? null,
      price: priceText ? normalisePrice(priceText) : null,
      promoter: null,
    });
  });

  // Deduplicate by sourceUrl
  const seen = new Set<string>();
  return events.filter(ev => {
    if (seen.has(ev.sourceUrl)) return false;
    seen.add(ev.sourceUrl);
    return true;
  });
}

// ---------- Fetcher ----------

async function fetchPage(url: string, errors: string[]): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      errors.push(`See Tickets ${url}: HTTP ${res.status}`);
      return null;
    }

    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    errors.push(`See Tickets fetch error (${url}): ${(err as Error).message}`);
    return null;
  }
}

async function scrapeUrl(
  url: string,
  fallbackVenue: string | undefined,
  errors: string[]
): Promise<CmEvent[]> {
  const html = await fetchPage(url, errors);
  if (!html) return [];

  const now = new Date();
  const jsonLdItems = extractJsonLdEvents(html);

  if (jsonLdItems.length > 0) {
    return jsonLdItems
      .map(item => parseJsonLdEvent(item, fallbackVenue))
      .filter((ev): ev is CmEvent => ev !== null && ev.startDate >= now);
  }

  // Fall back to HTML parsing
  const htmlEvents = parseHtmlEvents(html, url);
  return htmlEvents.filter(ev => ev.startDate >= now);
}

export const seeticketsFetcher: Fetcher = {
  name: 'seetickets',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];

    const targets: Array<{ url: string; venue?: string }> = [
      { url: TOWN_URL },
      { url: VENUE_URLS[0], venue: 'Hylands Park' },
      { url: VENUE_URLS[1], venue: 'Chelmsford City Racecourse' },
      { url: VENUE_URLS[2], venue: 'Central Park' },
    ];

    const results = await Promise.allSettled(targets.map(t => scrapeUrl(t.url, t.venue, errors)));

    const allEvents: CmEvent[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const ev of result.value) {
          if (!seen.has(ev.id)) {
            seen.add(ev.id);
            allEvents.push(ev);
          }
        }
      } else {
        errors.push(`See Tickets page failed: ${result.reason}`);
      }
    }

    if (allEvents.length === 0 && errors.some(e => e.includes('403'))) {
      errors.push(
        'See Tickets returned 403 — the site may be blocking automated requests. ' +
          'Consider registering for their affiliate API at group.seetickets.com.'
      );
    }

    return {
      source: 'seetickets',
      events: allEvents,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
