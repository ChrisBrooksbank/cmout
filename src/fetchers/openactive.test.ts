import { afterEach, describe, expect, it, vi } from 'vitest';
import { openactiveFetcher } from './openactive.js';

const SERIES_WITH_SESSIONS = 'https://example.com/session-series/1';
const SERIES_WITHOUT_SESSIONS = 'https://example.com/session-series/2';

function series(atId: string, name: string) {
  return {
    state: 'updated',
    kind: 'SessionSeries',
    id: atId,
    modified: '1',
    data: {
      '@id': atId,
      name,
      eventSchedule: [{ byDay: ['https://schema.org/Monday'] }],
      location: { name: 'Riverside Leisure Centre' },
    },
  };
}

const feeds: Record<string, unknown[]> = {
  'session-series': [
    series(SERIES_WITH_SESSIONS, 'Lane Swimming'),
    series(SERIES_WITHOUT_SESSIONS, 'Aqua Fit'),
  ],
  'scheduled-sessions': [
    {
      state: 'updated',
      kind: 'ScheduledSession',
      id: 'ss-1',
      modified: '1',
      data: { startDate: '2099-03-10T07:00:00Z', superEvent: SERIES_WITH_SESSIONS },
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openactiveFetcher', () => {
  it('only emits series placeholders for series without real sessions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        // First request for each feed returns its items; the "next" page is empty
        const feed = Object.keys(feeds).find(name => url.endsWith(`-live-${name}`));
        const items = feed ? feeds[feed] : [];
        return { ok: true, json: async () => ({ items, next: `${url}?afterId=end` }) };
      })
    );

    const result = await openactiveFetcher.fetch();
    const titles = result.events.map(e => e.title).sort();
    expect(titles).toEqual(['Aqua Fit', 'Lane Swimming']);
    const swim = result.events.find(e => e.title === 'Lane Swimming');
    expect(swim?.startDate.toISOString()).toBe('2099-03-10T07:00:00.000Z');
  });
});
