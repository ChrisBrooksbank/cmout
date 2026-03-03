import * as cheerio from 'cheerio';
import type { CmEvent, FetchResult, Fetcher } from '../types.js';
import { makeEventId, normalisePrice } from '../utils.js';

/**
 * Chelmsford Theatre Workshop (CTW) scraper.
 * Scrapes ctw.org.uk for productions at The Old Court Theatre.
 * HTML scraping with cheerio — no API available.
 */

const HOMEPAGE_URL = 'https://ctw.org.uk/';
const VENUE = 'The Old Court Theatre';
const ADDRESS = '233 Springfield Road, Chelmsford, CM2 6JT';
const LAT = 51.7375;
const LNG = 0.4878;

const ORDINAL_RE = /(\d+)(st|nd|rd|th)/gi;

const MONTH_MAP: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/**
 * Parse a date range like "19th – 23rd May 2026" into an array of Dates.
 * Also handles single dates like "21st April 2026".
 */
export function parseDateRange(text: string): Date[] {
  const clean = text
    .replace(/&ndash;|&#8211;|–/g, '-')
    .replace(ORDINAL_RE, '$1')
    .trim();

  // Match "21 - 25 April 2026" or "19 - 23 May 2026"
  const rangeMatch = clean.match(
    /(\d{1,2})\s*-\s*(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i
  );

  if (rangeMatch) {
    const startDay = parseInt(rangeMatch[1], 10);
    const endDay = parseInt(rangeMatch[2], 10);
    const month = MONTH_MAP[rangeMatch[3].toLowerCase()];
    const year = parseInt(rangeMatch[4], 10);

    const dates: Date[] = [];
    for (let d = startDay; d <= endDay; d++) {
      dates.push(new Date(year, month, d));
    }
    return dates;
  }

  // Match single date "21 April 2026"
  const singleMatch = clean.match(
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i
  );

  if (singleMatch) {
    const day = parseInt(singleMatch[1], 10);
    const month = MONTH_MAP[singleMatch[2].toLowerCase()];
    const year = parseInt(singleMatch[3], 10);
    return [new Date(year, month, day)];
  }

  return [];
}

/**
 * Parse a time string like "7.45pm" into hours and minutes.
 */
export function parseTime(text: string): { hours: number; minutes: number } | null {
  const match = text.match(/(\d{1,2})[.:](\d{2})\s*(am|pm)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toLowerCase();

  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  return { hours, minutes };
}

/**
 * Extract the plain text content from an HTML string, stripping tags.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|section|article)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ShowInfo {
  title: string;
  dates: Date[];
  eveningTime: { hours: number; minutes: number } | null;
  matineeTime: { hours: number; minutes: number } | null;
  hasMatinee: boolean;
  description: string;
  price: string | null;
  sourceUrl: string;
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

/**
 * Fetch the CTW homepage and extract "Current Season" show page URLs.
 */
async function getSeasonShowUrls(errors: string[]): Promise<string[]> {
  try {
    const html = await fetchPage(HOMEPAGE_URL);
    const $ = cheerio.load(html);

    const urls: string[] = [];

    // Find the "Current Season" menu item and its sub-menu links
    $('li.menu-item-has-children').each((_, el) => {
      const $el = $(el);
      const parentText = $el.find('> a').first().text().trim();
      if (/current season/i.test(parentText)) {
        $el.find('ul.sub-menu > li > a').each((_, link) => {
          const href = $(link).attr('href');
          if (href && href.startsWith('https://ctw.org.uk/')) {
            urls.push(href);
          }
        });
      }
    });

    return urls;
  } catch (err) {
    errors.push(`CTW homepage fetch error: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Fetch a show page and extract production info.
 */
async function parseShowPage(url: string, errors: string[]): Promise<ShowInfo | null> {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Extract the main content area (after nav, before footer widgets)
    const bodyText = htmlToText(
      $('div.entry-content, article, .post-content').first().html() ?? ''
    );

    if (!bodyText) {
      errors.push(`CTW: No content found on ${url}`);
      return null;
    }

    // Title: first <h2> or page title
    const title =
      $('h1.entry-title, h2.title, .entry-content h2').first().text().trim() ||
      $('title')
        .text()
        .replace(/\s*[|–-]\s*CTW.*$/i, '')
        .trim();

    if (!title) {
      errors.push(`CTW: No title found on ${url}`);
      return null;
    }

    // Date range: look for patterns like "19th – 23rd May 2026"
    const dateRangeMatch = bodyText.match(
      /\d{1,2}(?:st|nd|rd|th)?\s*[–-]\s*\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
    );

    const singleDateMatch = bodyText.match(
      /\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
    );

    const dateText = dateRangeMatch?.[0] ?? singleDateMatch?.[0];
    if (!dateText) {
      errors.push(`CTW: No date found on ${url}`);
      return null;
    }

    const dates = parseDateRange(dateText);
    if (dates.length === 0) {
      errors.push(`CTW: Could not parse date "${dateText}" on ${url}`);
      return null;
    }

    // Time: look for "7.45pm" or similar
    const timeMatch = bodyText.match(/at\s+(\d{1,2}[.:]\d{2}\s*(?:am|pm))/i);
    const eveningTime = timeMatch ? parseTime(timeMatch[1]) : { hours: 19, minutes: 45 };

    // Matinee: look for "Saturday Matinee at 2.30pm" or "matinee at 2.30pm"
    const matineeMatch = bodyText.match(/matinee\s+at\s+(\d{1,2}[.:]\d{2}\s*(?:am|pm))/i);
    const matineeTime = matineeMatch ? parseTime(matineeMatch[1]) : null;

    // Description: first substantial paragraph of content
    const descParts = bodyText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 50 && !/ticket|booking|concession|click/i.test(l));
    const description = descParts.slice(0, 2).join(' ');

    // Price
    const priceMatch = bodyText.match(/Standard\s+Tickets?\s+(?:are\s+)?£([\d.]+)/i);
    const price = priceMatch ? normalisePrice(priceMatch[1]) : null;

    return {
      title,
      dates,
      eveningTime,
      matineeTime,
      hasMatinee: matineeTime !== null,
      description,
      price,
      sourceUrl: url,
    };
  } catch (err) {
    errors.push(`CTW show page error (${url}): ${(err as Error).message}`);
    return null;
  }
}

export function showToEvents(show: ShowInfo): CmEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const events: CmEvent[] = [];

  for (const date of show.dates) {
    // Skip past dates
    if (date < now) continue;

    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

    // Evening performance
    if (show.eveningTime) {
      const startDate = new Date(date);
      startDate.setHours(show.eveningTime.hours, show.eveningTime.minutes, 0, 0);

      events.push({
        id: makeEventId('ctw', show.title, startDate.toISOString()),
        title: show.title,
        description: show.description,
        startDate,
        endDate: null,
        venue: VENUE,
        address: ADDRESS,
        category: 'theatre-comedy',
        source: 'ctw',
        sourceUrl: show.sourceUrl,
        latitude: LAT,
        longitude: LNG,
        imageUrl: null,
        price: show.price,
        promoter: 'Chelmsford Theatre Workshop',
      });
    }

    // Saturday matinee
    if (show.hasMatinee && show.matineeTime && dayOfWeek === 6) {
      const matineeDate = new Date(date);
      matineeDate.setHours(show.matineeTime.hours, show.matineeTime.minutes, 0, 0);

      events.push({
        id: makeEventId('ctw', show.title, matineeDate.toISOString()),
        title: `${show.title} (Matinee)`,
        description: show.description,
        startDate: matineeDate,
        endDate: null,
        venue: VENUE,
        address: ADDRESS,
        category: 'theatre-comedy',
        source: 'ctw',
        sourceUrl: show.sourceUrl,
        latitude: LAT,
        longitude: LNG,
        imageUrl: null,
        price: show.price,
        promoter: 'Chelmsford Theatre Workshop',
      });
    }
  }

  return events;
}

export const ctwFetcher: Fetcher = {
  name: 'ctw',
  async fetch(): Promise<FetchResult> {
    const start = Date.now();
    const errors: string[] = [];
    const events: CmEvent[] = [];

    const showUrls = await getSeasonShowUrls(errors);

    if (showUrls.length === 0) {
      errors.push('CTW: No season show URLs found');
      return {
        source: 'ctw',
        events: [],
        errors,
        fetchedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }

    const results = await Promise.allSettled(showUrls.map(url => parseShowPage(url, errors)));

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        events.push(...showToEvents(result.value));
      } else if (result.status === 'rejected') {
        errors.push(`CTW show fetch failed: ${result.reason}`);
      }
    }

    return {
      source: 'ctw',
      events,
      errors,
      fetchedAt: new Date(),
      durationMs: Date.now() - start,
    };
  },
};
