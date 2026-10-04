import { describe, it, expect, vi } from 'vitest';
import type { CmEvent, Fetcher } from './types.js';

function makeEvent(id: string, startDate: Date, endDate: Date | null): CmEvent {
  return {
    id,
    title: `Event ${id}`,
    description: '',
    startDate,
    endDate,
    venue: `Venue ${id}`,
    address: '',
    category: 'community',
    source: 'openactive',
    sourceUrl: '',
    latitude: null,
    longitude: null,
    imageUrl: null,
    price: null,
    promoter: null,
  };
}

const HOUR = 60 * 60 * 1000;
const now = Date.now();
const events = [
  makeEvent('ended', new Date(now - 3 * HOUR), new Date(now - 2 * HOUR)),
  makeEvent('past-no-end', new Date(now - HOUR), null),
  makeEvent('in-progress', new Date(now - HOUR), new Date(now + HOUR)),
  makeEvent('upcoming', new Date(now + HOUR), null),
];

vi.mock('./fetchers/index.js', () => {
  const fetcher = (name: string, evs: CmEvent[] = []): Fetcher =>
    ({
      name,
      fetch: async () => ({
        source: name,
        events: evs,
        errors: [],
        fetchedAt: new Date(),
        durationMs: 0,
      }),
    }) as Fetcher;
  return {
    openactiveFetcher: fetcher('openactive', events),
    skiddleFetcher: fetcher('skiddle'),
    ents24Fetcher: fetcher('ents24'),
    ticketmasterFetcher: fetcher('ticketmaster'),
    icalFetcher: fetcher('ical'),
    diceFetcher: fetcher('dice'),
    wegotticketsFetcher: fetcher('wegottickets'),
    meetupFetcher: fetcher('meetup'),
    eventbriteFetcher: fetcher('eventbrite'),
    ctwFetcher: fetcher('ctw'),
    chelmsfordTheatreFetcher: fetcher('chelmsford-theatre'),
    outsavvyFetcher: fetcher('outsavvy'),
    seeticketsFetcher: fetcher('seetickets'),
  };
});

describe('aggregateEvents', () => {
  it('drops events that have already finished', async () => {
    const { aggregateEvents } = await import('./aggregator.js');
    const result = await aggregateEvents(['openactive']);
    expect(result.events.map(e => e.id)).toEqual(['in-progress', 'upcoming']);
    expect(result.totalRaw).toBe(4);
  });
});
