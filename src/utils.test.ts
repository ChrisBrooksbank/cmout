import { describe, it, expect } from 'vitest';
import type { CmEvent } from './types.js';
import { deduplicateEvents, isValidSourceUrl } from './utils.js';

function makeEvent(overrides: Partial<CmEvent> = {}): CmEvent {
  return {
    id: 'evt',
    title: 'Lane Swimming',
    description: '',
    startDate: new Date(2026, 2, 10, 7, 0),
    endDate: null,
    venue: 'Riverside Leisure Centre',
    address: '',
    category: 'fitness-class',
    source: 'openactive',
    sourceUrl: '',
    latitude: null,
    longitude: null,
    imageUrl: null,
    price: null,
    promoter: null,
    ...overrides,
  };
}

describe('deduplicateEvents', () => {
  it('keeps repeat sessions from the same source on the same day', () => {
    const events = [7, 12, 18].map(hour =>
      makeEvent({ id: `s${hour}`, startDate: new Date(2026, 2, 10, hour, 0) })
    );
    expect(deduplicateEvents(events)).toHaveLength(3);
  });

  it('drops repeated listings with the same id', () => {
    const events = [makeEvent({ id: 'a' }), makeEvent({ id: 'a' })];
    expect(deduplicateEvents(events)).toHaveLength(1);
  });

  it('merges the same event listed by two sources, preferring the higher-priority one', () => {
    const events = [
      makeEvent({ id: 'tm', source: 'ticketmaster', title: 'The Band', venue: 'Hot Box' }),
      makeEvent({ id: 'sk', source: 'skiddle', title: 'The Band', venue: 'Hot Box' }),
    ];
    const result = deduplicateEvents(events);
    expect(result.map(e => e.id)).toEqual(['sk']);
  });

  it('treats doors and show times a short while apart as the same event', () => {
    const events = [
      makeEvent({ id: 'sk', source: 'skiddle', startDate: new Date(2026, 2, 10, 19, 0) }),
      makeEvent({ id: 'tm', source: 'ticketmaster', startDate: new Date(2026, 2, 10, 20, 0) }),
    ];
    expect(deduplicateEvents(events)).toHaveLength(1);
  });

  it('keeps a matinee and an evening performance listed by different sources', () => {
    const events = [
      makeEvent({ id: 'm', source: 'ticketmaster', startDate: new Date(2026, 2, 10, 14, 30) }),
      makeEvent({
        id: 'e',
        source: 'chelmsford-theatre',
        startDate: new Date(2026, 2, 10, 19, 30),
      }),
    ];
    expect(deduplicateEvents(events)).toHaveLength(2);
  });

  it('matches across sources when one has no start time', () => {
    const events = [
      makeEvent({ id: 'sk', source: 'skiddle', startDate: new Date(2026, 2, 10, 0, 0) }),
      makeEvent({ id: 'tm', source: 'ticketmaster', startDate: new Date(2026, 2, 10, 19, 30) }),
    ];
    expect(deduplicateEvents(events)).toHaveLength(1);
  });
});

describe('isValidSourceUrl', () => {
  it('accepts normal event links', () => {
    expect(isValidSourceUrl('https://dice.fm/event/692f29724c69ef0001cfa9b6')).toBe(true);
    expect(
      isValidSourceUrl(
        'https://chelmsfordcitysports.gladstonego.cloud/book/calendar/X?activityDate=2026-03-01T10:00:00.000Z'
      )
    ).toBe(true);
    expect(isValidSourceUrl('https://example.com/events/undefined-behaviour-talk')).toBe(true);
  });

  it('rejects links built from missing fields', () => {
    expect(isValidSourceUrl('https://dice.fm/event/undefined')).toBe(false);
    expect(isValidSourceUrl('https://example.com/e?id=null')).toBe(false);
    expect(isValidSourceUrl('')).toBe(false);
    expect(isValidSourceUrl('/event/123')).toBe(false);
    expect(isValidSourceUrl('javascript:alert(1)')).toBe(false);
  });
});
