import { describe, expect, it } from 'vitest';
import type { CmEvent } from './types';
import { buildDaySections, groupRepeats } from './listing';

function makeEvent(overrides: Partial<CmEvent> = {}): CmEvent {
  return {
    id: 'e',
    title: 'Event',
    description: '',
    startDate: new Date(2026, 9, 4, 19, 0),
    endDate: null,
    venue: 'Hot Box',
    address: '',
    category: 'live-music',
    source: 'skiddle',
    sourceUrl: 'https://example.com',
    latitude: null,
    longitude: null,
    imageUrl: null,
    price: null,
    promoter: null,
    ...overrides,
  };
}

const now = new Date(2026, 9, 4, 10, 0);

describe('groupRepeats', () => {
  it('folds same title + venue into one item and keeps singles as events', () => {
    const items = groupRepeats([
      makeEvent({ id: 'a1', title: 'Lane Swimming', venue: 'Riverside' }),
      makeEvent({ id: 'b', title: 'Pilates', venue: 'Riverside' }),
      makeEvent({ id: 'a2', title: 'Lane Swimming', venue: 'Riverside' }),
      makeEvent({ id: 'c', title: 'Lane Swimming', venue: 'Dovedale' }),
    ]);
    expect(items.map(i => (i.kind === 'event' ? i.event.id : i.events.map(e => e.id)))).toEqual([
      ['a1', 'a2'],
      'b',
      'c',
    ]);
  });
});

describe('buildDaySections', () => {
  it('splits events into chronological days with leisure sessions separated', () => {
    const sections = buildDaySections(
      [
        makeEvent({ id: 'tomorrow-gig', startDate: new Date(2026, 9, 5, 20, 0) }),
        makeEvent({
          id: 'swim',
          title: 'Lane Swimming',
          source: 'openactive',
          category: 'fitness-class',
          startDate: new Date(2026, 9, 4, 7, 0),
        }),
        makeEvent({ id: 'gig', startDate: new Date(2026, 9, 4, 19, 0) }),
      ],
      { now }
    );
    expect(sections.map(s => s.key)).toEqual(['2026-10-04', '2026-10-05']);
    expect(sections[0].highlights.map(i => i.key)).toEqual(['gig']);
    expect(sections[0].sessions.map(i => i.key)).toEqual(['swim']);
    expect(sections[0].eventCount).toBe(2);
  });

  it('lists events still running from earlier days under today', () => {
    const sections = buildDaySections(
      [
        makeEvent({
          id: 'festival',
          startDate: new Date(2026, 9, 2, 10, 0),
          endDate: new Date(2026, 9, 6, 18, 0),
        }),
      ],
      { now }
    );
    expect(sections[0].key).toBe('2026-10-04');
  });

  it('balances categories within a day when asked', () => {
    const at = (h: number) => new Date(2026, 9, 4, h, 0);
    const sections = buildDaySections(
      [
        makeEvent({ id: 'k1', title: 'K1', category: 'kids', startDate: at(9) }),
        makeEvent({ id: 'k2', title: 'K2', category: 'kids', startDate: at(10) }),
        makeEvent({ id: 'k3', title: 'K3', category: 'kids', startDate: at(11) }),
        makeEvent({ id: 'm1', title: 'M1', startDate: at(20) }),
      ],
      { now, balance: true }
    );
    expect(sections[0].highlights.map(i => i.key)).toEqual(['k1', 'k2', 'm1', 'k3']);
  });
});
