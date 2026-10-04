import { describe, it, expect } from 'vitest';
import { parseDiceEvent } from './dice.js';

// Shape of an event on dice.fm venue pages as of 2026-10 (no perm_name or tags_types)
const currentEvent = {
  id: '692f29724c69ef0001cfa9b6',
  name: "Charlie Hart's Equators",
  status: 'on-sale',
  images: { square: 'https://dice-media.imgix.net/a.jpg' },
  dates: {
    timezone: 'Europe/London',
    event_start_date: '2026-10-04T15:00:00+01:00',
    event_end_date: '2026-10-04T20:00:00+01:00',
  },
  venues: [
    {
      name: 'Hot Box',
      address: '28 Viaduct Rd, Chelmsford CM1 1TS, UK',
      city: { location: { lat: 51.736717, lng: 0.466083 } },
    },
  ],
  price: { currency: 'GBP', amount: 1650, amount_from: null },
};

describe('parseDiceEvent', () => {
  it('builds a working event URL from the id when perm_name is missing', () => {
    const ev = parseDiceEvent(currentEvent as never);
    expect(ev?.sourceUrl).toBe('https://dice.fm/event/692f29724c69ef0001cfa9b6');
  });

  it('prefers perm_name when present', () => {
    const ev = parseDiceEvent({ ...currentEvent, perm_name: 'abc-gig' } as never);
    expect(ev?.sourceUrl).toBe('https://dice.fm/event/abc-gig');
  });

  it('reads coordinates from the venue city and defaults untagged events to live music', () => {
    const ev = parseDiceEvent(currentEvent as never);
    expect(ev?.latitude).toBe(51.736717);
    expect(ev?.longitude).toBe(0.466083);
    expect(ev?.category).toBe('live-music');
    expect(ev?.price).toBe('£16.50');
    expect(ev?.imageUrl).toBe('https://dice-media.imgix.net/a.jpg');
  });
});
