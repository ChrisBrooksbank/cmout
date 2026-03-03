import type { CmEvent } from './types.js';

// Chelmsford centre coordinates
export const CHELMSFORD_LAT = 51.7356;
export const CHELMSFORD_LNG = 0.4685;
export const DEFAULT_RADIUS_MILES = 10;

/**
 * Generate a deterministic ID from source + key fields.
 */
export function makeEventId(source: string, ...parts: string[]): string {
  const raw = [source, ...parts].join('|').toLowerCase();
  // Simple hash - good enough for dedup
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `${source}_${Math.abs(hash).toString(36)}`;
}

/**
 * Normalise a string for fuzzy comparison (lowercase, strip punctuation, collapse whitespace).
 */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two events are likely duplicates.
 * Matches on normalised title similarity + same date + similar venue.
 */
export function isDuplicate(a: CmEvent, b: CmEvent): boolean {
  // Must be on the same day
  const sameDay = a.startDate.toDateString() === b.startDate.toDateString();
  if (!sameDay) return false;

  const titleA = normalise(a.title);
  const titleB = normalise(b.title);

  // Exact title match
  if (titleA === titleB) return true;

  // One title contains the other
  if (titleA.includes(titleB) || titleB.includes(titleA)) {
    // Also check venue similarity
    const venueA = normalise(a.venue);
    const venueB = normalise(b.venue);
    if (venueA === venueB) return true;
    if (venueA.includes(venueB) || venueB.includes(venueA)) return true;
  }

  return false;
}

/**
 * Deduplicate events, preferring sources in priority order.
 */
const SOURCE_PRIORITY: Record<string, number> = {
  openactive: 1,
  skiddle: 2,
  ents24: 3,
  ticketmaster: 4,
  dice: 5,
  ical: 6,
  wegottickets: 7,
  meetup: 8,
};

export function deduplicateEvents(events: CmEvent[]): CmEvent[] {
  // Sort by source priority (prefer higher-priority sources)
  const sorted = [...events].sort(
    (a, b) => (SOURCE_PRIORITY[a.source] ?? 99) - (SOURCE_PRIORITY[b.source] ?? 99)
  );

  const result: CmEvent[] = [];
  for (const event of sorted) {
    const hasDupe = result.some(existing => isDuplicate(existing, event));
    if (!hasDupe) {
      result.push(event);
    }
  }

  return result.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Truncate string to maxLen, adding ellipsis if needed.
 */
export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

/**
 * Safe JSON fetch with timeout.
 */
export async function fetchJson<T>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText} for ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
