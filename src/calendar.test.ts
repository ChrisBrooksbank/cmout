import { describe, expect, it } from 'vitest';
import type { CmEvent } from './types';
import { buildIcs, directionsUrl } from './calendar';

const event: CmEvent = {
  id: 'dice_abc',
  title: 'Gig; with, punctuation',
  description: 'Line one\nLine two',
  startDate: new Date('2026-10-04T18:30:00Z'),
  endDate: new Date('2026-10-04T22:00:00Z'),
  venue: 'Hot Box',
  address: '28 Viaduct Rd, Chelmsford CM1 1TS',
  category: 'live-music',
  source: 'dice',
  sourceUrl: 'https://dice.fm/event/abc',
  latitude: 51.7367,
  longitude: 0.4661,
  imageUrl: null,
  price: '£10.00',
  promoter: null,
};

describe('buildIcs', () => {
  it('builds a valid VEVENT with escaped text and UTC times', () => {
    const ics = buildIcs(event, new Date('2026-10-01T00:00:00Z'));
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DTSTART:20261004T183000Z');
    expect(ics).toContain('DTEND:20261004T220000Z');
    expect(ics).toContain(String.raw`SUMMARY:Gig\; with\, punctuation`);
    expect(ics).toContain(String.raw`LOCATION:Hot Box\, 28 Viaduct Rd\, Chelmsford CM1 1TS`);
    expect(ics).toContain('URL:https://dice.fm/event/abc');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.split('\r\n').every(line => line.length <= 75)).toBe(true);
  });

  it('defaults to two hours when there is no end time', () => {
    const ics = buildIcs({ ...event, endDate: null });
    expect(ics).toContain('DTEND:20261004T203000Z');
  });

  it('makes events without a published time all-day', () => {
    const ics = buildIcs({ ...event, startDate: new Date(2026, 9, 4), endDate: null });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261004');
    expect(ics).toContain('DTEND;VALUE=DATE:20261005');
  });
});

describe('directionsUrl', () => {
  it('searches for the venue and address', () => {
    expect(directionsUrl(event)).toBe(
      'https://www.google.com/maps/search/?api=1&query=Hot%20Box%2C%2028%20Viaduct%20Rd%2C%20Chelmsford%20CM1%201TS'
    );
  });

  it('falls back to coordinates, and to nothing for an unknown venue', () => {
    expect(directionsUrl({ ...event, address: '' })).toContain('query=51.7367%2C0.4661');
    expect(
      directionsUrl({
        ...event,
        address: '',
        latitude: null,
        longitude: null,
        venue: 'Unknown venue',
      })
    ).toBeNull();
  });
});
