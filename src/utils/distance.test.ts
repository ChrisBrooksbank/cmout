import { describe, expect, it } from 'vitest';
import { calculateDistanceMiles, formatDistanceMiles, getEventDistanceMiles } from './distance';
import type { CmEvent } from '../types';

const event: CmEvent = {
  id: 'evt-1',
  title: 'Test Event',
  description: 'A test event',
  startDate: new Date('2026-07-15T19:30:00Z'),
  endDate: null,
  venue: 'Hylands Park',
  address: 'Chelmsford',
  category: 'community',
  source: 'openactive',
  sourceUrl: 'https://example.com/event',
  latitude: 51.712,
  longitude: 0.429,
  imageUrl: null,
  price: null,
  promoter: null,
};

describe('distance utilities', () => {
  it('calculates distance in miles between two coordinates', () => {
    const distance = calculateDistanceMiles(
      { latitude: 51.736, longitude: 0.469 },
      { latitude: 51.712, longitude: 0.429 }
    );

    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(3);
  });

  it('returns event distance when coordinates are available', () => {
    expect(getEventDistanceMiles(event, { latitude: 51.736, longitude: 0.469 })).toBeCloseTo(
      2.4,
      1
    );
  });

  it('returns null when event coordinates are missing', () => {
    expect(
      getEventDistanceMiles(
        { ...event, latitude: null, longitude: null },
        { latitude: 51.736, longitude: 0.469 }
      )
    ).toBeNull();
  });

  it('formats distances for display', () => {
    expect(formatDistanceMiles(0.04)).toBe('Nearby');
    expect(formatDistanceMiles(1.24)).toBe('1.2 mi away');
    expect(formatDistanceMiles(12.4)).toBe('12 mi away');
  });
});
