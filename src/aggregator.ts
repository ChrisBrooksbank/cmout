import type { CmEvent, FetchResult, Fetcher, EventSource } from './types.js';
import { deduplicateEvents, truncate } from './utils.js';
import {
  openactiveFetcher,
  skiddleFetcher,
  ents24Fetcher,
  ticketmasterFetcher,
  icalFetcher,
  diceFetcher,
  wegotticketsFetcher,
  meetupFetcher,
} from './fetchers/index.js';

const ALL_FETCHERS: Fetcher[] = [
  openactiveFetcher,
  skiddleFetcher,
  ents24Fetcher,
  ticketmasterFetcher,
  diceFetcher,
  wegotticketsFetcher,
  meetupFetcher,
  icalFetcher,
];

export interface AggregateResult {
  events: CmEvent[];
  rawResults: FetchResult[];
  totalRaw: number;
  totalDeduped: number;
  fetchedAt: Date;
}

export async function aggregateEvents(sources?: EventSource[]): Promise<AggregateResult> {
  const fetchers = sources ? ALL_FETCHERS.filter(f => sources.includes(f.name)) : ALL_FETCHERS;

  const results = await Promise.allSettled(fetchers.map(f => f.fetch()));

  const fetchResults: FetchResult[] = [];
  const allEvents: CmEvent[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      fetchResults.push(result.value);
      allEvents.push(...result.value.events);
    }
  }

  const deduped = deduplicateEvents(allEvents);

  return {
    events: deduped,
    rawResults: fetchResults,
    totalRaw: allEvents.length,
    totalDeduped: deduped.length,
    fetchedAt: new Date(),
  };
}

export function printReport(result: AggregateResult): void {
  const { events, rawResults, totalRaw, totalDeduped } = result;

  console.log('\n' + '='.repeat(72));
  console.log('  CHELMSFORD EVENTS AGGREGATOR - Coverage Report');
  console.log('='.repeat(72));

  // Per-source summary
  console.log('\n--- Source Summary ---\n');
  console.log(
    'Source'.padEnd(16) + 'Events'.padStart(8) + 'Errors'.padStart(8) + 'Time (ms)'.padStart(12)
  );
  console.log('-'.repeat(44));

  for (const r of rawResults) {
    const errCount = r.errors.length;
    console.log(
      r.source.padEnd(16) +
        String(r.events.length).padStart(8) +
        String(errCount).padStart(8) +
        String(r.durationMs).padStart(12)
    );
  }

  console.log('-'.repeat(44));
  console.log('TOTAL (raw)'.padEnd(16) + String(totalRaw).padStart(8));
  console.log('After dedup'.padEnd(16) + String(totalDeduped).padStart(8));

  // Category breakdown
  const byCat: Record<string, number> = {};
  for (const ev of events) {
    byCat[ev.category] = (byCat[ev.category] ?? 0) + 1;
  }

  console.log('\n--- Category Breakdown ---\n');
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }

  // Date range
  if (events.length > 0) {
    const earliest = events[0].startDate;
    const latest = events[events.length - 1].startDate;
    console.log('\n--- Date Range ---\n');
    console.log(`  Earliest: ${earliest.toLocaleDateString('en-GB')}`);
    console.log(`  Latest:   ${latest.toLocaleDateString('en-GB')}`);
  }

  // Venue breakdown (top 15)
  const byVenue: Record<string, number> = {};
  for (const ev of events) {
    byVenue[ev.venue] = (byVenue[ev.venue] ?? 0) + 1;
  }

  console.log('\n--- Top Venues ---\n');
  const topVenues = Object.entries(byVenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [venue, count] of topVenues) {
    console.log(`  ${truncate(venue, 40).padEnd(42)} ${count}`);
  }

  // Errors
  const allErrors = rawResults.flatMap(r => r.errors.map(e => `[${r.source}] ${e}`));
  if (allErrors.length > 0) {
    console.log('\n--- Errors ---\n');
    for (const err of allErrors) {
      console.log(`  ! ${err}`);
    }
  }

  // Sample events
  console.log('\n--- Sample Events (next 14 days) ---\n');
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const upcoming = events.filter(e => e.startDate >= new Date() && e.startDate <= twoWeeks);

  const sample = upcoming.slice(0, 20);
  for (const ev of sample) {
    const date = ev.startDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const time = ev.startDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    console.log(
      `  ${date} ${time}  ${truncate(ev.title, 35).padEnd(37)} @ ${truncate(ev.venue, 25)}  [${ev.source}]`
    );
  }

  if (upcoming.length > 20) {
    console.log(`  ... and ${upcoming.length - 20} more events`);
  }

  console.log('\n' + '='.repeat(72) + '\n');
}
