import { describe, expect, it, vi } from 'vitest';
import {
  checkFreshness,
  classifyStatus,
  compareCounts,
  formatReport,
  pickSample,
  runHealthCheck,
  type LiveEvent,
} from './site-health';

const now = new Date('2026-10-04T08:00:00Z');

function ev(id: string, source: string, startDate = '2026-10-05T19:00:00Z'): LiveEvent {
  return { id, title: `Event ${id}`, source, sourceUrl: `https://example.com/${id}`, startDate };
}

function response(status: number) {
  return { status, body: { cancel: () => Promise.resolve() } } as unknown as Response;
}

describe('checkFreshness', () => {
  it('accepts data from the last day and flags stale data', () => {
    expect(checkFreshness('2026-10-04T05:00:00Z', now)).toBeNull();
    expect(checkFreshness('2026-10-02T05:00:00Z', now)).toMatch(/51 hours old/);
  });
});

describe('compareCounts', () => {
  it('flags sources that vanished or halved, ignoring small ones', () => {
    const problems = compareCounts(
      { dice: 30, eventbrite: 40, skiddle: 33, meetup: 3 },
      { dice: 30, skiddle: 10, meetup: 0 }
    );
    expect(problems).toEqual([
      '**eventbrite** returned no events (previously 40)',
      '**skiddle** dropped from 33 to 10 events',
    ]);
  });
});

describe('pickSample', () => {
  it('takes evenly spaced upcoming events per source with distinct URLs', () => {
    const events = [
      ev('past', 'dice', '2026-10-01T19:00:00Z'),
      ...Array.from({ length: 10 }, (_, i) => ev(`d${i}`, 'dice')),
      ev('s1', 'skiddle'),
      { ...ev('s1-dupe', 'skiddle'), sourceUrl: 'https://example.com/s1' },
    ];
    const sample = pickSample(events, 3, now);
    expect(sample.map(e => e.id)).toEqual(['d0', 'd3', 'd6', 's1']);
  });
});

describe('classifyStatus', () => {
  it('treats bot blocks as unknown rather than broken', () => {
    expect(classifyStatus(200)).toBe('ok');
    expect(classifyStatus(403)).toBe('blocked');
    expect(classifyStatus(429)).toBe('blocked');
    expect(classifyStatus(404)).toBe('broken');
    expect(classifyStatus(500)).toBe('broken');
  });
});

describe('runHealthCheck', () => {
  it('reports broken links and summarises blocked sources', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith('/broken')) return response(404);
      if (u.includes('blocked')) return response(403);
      return response(200);
    }) as unknown as typeof fetch;

    const report = await runHealthCheck({
      data: {
        fetchedAt: '2026-10-04T05:00:00Z',
        events: [
          ev('ok', 'dice'),
          ev('broken', 'skiddle'),
          ev('blocked-1', 'ticketmaster'),
          ev('blocked-2', 'ticketmaster'),
        ],
      },
      previousCounts: { dice: 1 },
      now,
      fetchImpl,
    });

    expect(report.problems).toEqual([
      'Broken link (404) for **Event broken** [skiddle]: https://example.com/broken',
    ]);
    expect(report.warnings).toEqual([
      "**ticketmaster**: 2 link(s) couldn't be checked (HTTP 403 — the site blocks automated requests)",
    ]);
    // Broken links are retried once before being reported
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(formatReport(report, 'https://cmout.netlify.app', { dice: 1 })).toContain(
      'Checked 4 links on https://cmout.netlify.app: 1 OK.'
    );
  });

  it('treats network errors as broken after a retry', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new Error('getaddrinfo ENOTFOUND')) as unknown as typeof fetch;
    const report = await runHealthCheck({
      data: { fetchedAt: '2026-10-04T05:00:00Z', events: [ev('gone', 'meetup')] },
      previousCounts: null,
      now,
      fetchImpl,
    });
    expect(report.problems[0]).toMatch(/Broken link \(getaddrinfo ENOTFOUND\)/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
