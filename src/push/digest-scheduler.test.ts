import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  selectEventsForSubscriber,
  buildDigest,
  runDailyDigest,
  type DigestPayload,
  type SendFn,
} from './digest-scheduler.js';
import {
  addSubscription,
  clearSubscriptions,
  type PushSubscriptionData,
  type StoredSubscription,
} from './subscription-store.js';
import type { CmEvent } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<CmEvent> = {}): CmEvent {
  return {
    id: 'evt-1',
    title: 'Test Event',
    description: '',
    startDate: new Date('2026-03-02T10:00:00Z'),
    endDate: null,
    venue: 'Civic Centre',
    address: 'Chelmsford',
    category: 'live-music',
    source: 'openactive',
    sourceUrl: 'https://example.com/evt-1',
    latitude: null,
    longitude: null,
    imageUrl: null,
    price: null,
    ...overrides,
  };
}

function makePushSub(endpoint = 'https://push.example.com/ep-1'): PushSubscriptionData {
  return { endpoint, keys: { auth: 'auth', p256dh: 'p256dh' } };
}

function makeStoredSub(
  categories: string[],
  frequency: 'immediate' | 'daily-digest' = 'daily-digest',
  endpoint = 'https://push.example.com/ep-1'
): StoredSubscription {
  return {
    subscription: makePushSub(endpoint),
    categories,
    frequency,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// selectEventsForSubscriber
// ---------------------------------------------------------------------------

describe('selectEventsForSubscriber', () => {
  it('returns events matching subscriber categories', () => {
    const sub = makeStoredSub(['live-music', 'sport']);
    const events = [
      makeEvent({ id: 'e1', category: 'live-music' }),
      makeEvent({ id: 'e2', category: 'community' }),
      makeEvent({ id: 'e3', category: 'sport' }),
    ];
    const result = selectEventsForSubscriber(events, sub);
    expect(result.map(e => e.id)).toEqual(['e1', 'e3']);
  });

  it('returns empty array when no categories match', () => {
    const sub = makeStoredSub(['festival']);
    const events = [makeEvent({ category: 'live-music' })];
    expect(selectEventsForSubscriber(events, sub)).toHaveLength(0);
  });

  it('filters out events starting before sinceDate', () => {
    const sub = makeStoredSub(['live-music']);
    const since = new Date('2026-03-02T00:00:00Z');
    const events = [
      makeEvent({ id: 'past', startDate: new Date('2026-03-01T10:00:00Z') }),
      makeEvent({ id: 'future', startDate: new Date('2026-03-02T10:00:00Z') }),
    ];
    const result = selectEventsForSubscriber(events, sub, since);
    expect(result.map(e => e.id)).toEqual(['future']);
  });

  it('includes events starting exactly at sinceDate', () => {
    const sub = makeStoredSub(['live-music']);
    const since = new Date('2026-03-02T10:00:00Z');
    const event = makeEvent({ startDate: since });
    expect(selectEventsForSubscriber([event], sub, since)).toHaveLength(1);
  });

  it('returns all matching events when sinceDate is not provided', () => {
    const sub = makeStoredSub(['live-music']);
    const events = [
      makeEvent({ id: 'e1', startDate: new Date('2025-01-01T00:00:00Z') }),
      makeEvent({ id: 'e2', startDate: new Date('2026-03-02T00:00:00Z') }),
    ];
    expect(selectEventsForSubscriber(events, sub)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// buildDigest
// ---------------------------------------------------------------------------

describe('buildDigest', () => {
  it('returns null when no events match', () => {
    const sub = makeStoredSub(['festival']);
    expect(buildDigest([makeEvent({ category: 'live-music' })], sub)).toBeNull();
  });

  it('returns a payload with correct event count', () => {
    const sub = makeStoredSub(['live-music']);
    const events = [makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })];
    const payload = buildDigest(events, sub);
    expect(payload?.eventCount).toBe(2);
  });

  it('title uses singular for one event', () => {
    const sub = makeStoredSub(['live-music']);
    const payload = buildDigest([makeEvent()], sub);
    expect(payload?.title).toBe('1 new event in Chelmsford');
  });

  it('title uses plural for multiple events', () => {
    const sub = makeStoredSub(['live-music']);
    const events = [makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })];
    const payload = buildDigest(events, sub);
    expect(payload?.title).toBe('2 new events in Chelmsford');
  });

  it('body lists up to 3 event titles directly', () => {
    const sub = makeStoredSub(['live-music']);
    const events = [
      makeEvent({ id: 'e1', title: 'Gig A' }),
      makeEvent({ id: 'e2', title: 'Gig B' }),
      makeEvent({ id: 'e3', title: 'Gig C' }),
    ];
    const payload = buildDigest(events, sub);
    expect(payload?.body).toBe('Gig A, Gig B, Gig C');
  });

  it('body appends "and N more" for more than 3 events', () => {
    const sub = makeStoredSub(['live-music']);
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `e${i}`, title: `Gig ${i}` })
    );
    const payload = buildDigest(events, sub);
    expect(payload?.body).toMatch(/and 2 more$/);
  });

  it('digest events include id, title, startDate, category, url', () => {
    const sub = makeStoredSub(['live-music']);
    const event = makeEvent({
      id: 'evt-42',
      title: 'Jazz Night',
      startDate: new Date('2026-03-05T19:00:00Z'),
      category: 'live-music',
      sourceUrl: 'https://example.com/jazz',
    });
    const payload = buildDigest([event], sub) as DigestPayload;
    const de = payload.events[0];
    expect(de.id).toBe('evt-42');
    expect(de.title).toBe('Jazz Night');
    expect(de.startDate).toBe('2026-03-05T19:00:00.000Z');
    expect(de.category).toBe('live-music');
    expect(de.url).toBe('https://example.com/jazz');
  });

  it('respects sinceDate filtering', () => {
    const sub = makeStoredSub(['live-music']);
    const since = new Date('2026-03-03T00:00:00Z');
    const events = [
      makeEvent({ id: 'past', startDate: new Date('2026-03-02T10:00:00Z') }),
      makeEvent({ id: 'future', startDate: new Date('2026-03-04T10:00:00Z') }),
    ];
    const payload = buildDigest(events, sub, since);
    expect(payload?.eventCount).toBe(1);
    expect(payload?.events[0].id).toBe('future');
  });
});

// ---------------------------------------------------------------------------
// runDailyDigest
// ---------------------------------------------------------------------------

describe('runDailyDigest', () => {
  beforeEach(() => {
    clearSubscriptions();
  });

  it('returns empty results when no subscriptions exist', async () => {
    const results = await runDailyDigest([makeEvent()]);
    expect(results).toEqual([]);
  });

  it('skips immediate-frequency subscriptions', async () => {
    addSubscription(makePushSub(), { categories: ['live-music'], frequency: 'immediate' });
    const results = await runDailyDigest([makeEvent()]);
    expect(results).toHaveLength(0);
  });

  it('processes daily-digest subscriptions', async () => {
    addSubscription(makePushSub(), { categories: ['live-music'], frequency: 'daily-digest' });
    const send = vi.fn<SendFn>().mockResolvedValue(undefined);
    const results = await runDailyDigest([makeEvent()], undefined, send);
    expect(results).toHaveLength(1);
    expect(results[0].sent).toBe(true);
    expect(results[0].eventCount).toBe(1);
  });

  it('does not call sendFn when no events match the subscriber', async () => {
    addSubscription(makePushSub(), { categories: ['festival'], frequency: 'daily-digest' });
    const send = vi.fn<SendFn>().mockResolvedValue(undefined);
    const results = await runDailyDigest([makeEvent({ category: 'live-music' })], undefined, send);
    expect(send).not.toHaveBeenCalled();
    expect(results[0].sent).toBe(false);
    expect(results[0].eventCount).toBe(0);
  });

  it('records an error when sendFn throws', async () => {
    addSubscription(makePushSub(), { categories: ['live-music'], frequency: 'daily-digest' });
    const send = vi.fn<SendFn>().mockRejectedValue(new Error('Network error'));
    const results = await runDailyDigest([makeEvent()], undefined, send);
    expect(results[0].sent).toBe(false);
    expect(results[0].error).toBe('Network error');
    expect(results[0].eventCount).toBe(1);
  });

  it('passes sinceDate to digest builder', async () => {
    addSubscription(makePushSub(), { categories: ['live-music'], frequency: 'daily-digest' });
    const send = vi.fn<SendFn>().mockResolvedValue(undefined);
    const since = new Date('2026-03-10T00:00:00Z');
    // Event starts before sinceDate — should be excluded
    const pastEvent = makeEvent({ startDate: new Date('2026-03-09T10:00:00Z') });
    const results = await runDailyDigest([pastEvent], since, send);
    expect(send).not.toHaveBeenCalled();
    expect(results[0].sent).toBe(false);
  });

  it('processes multiple daily-digest subscribers independently', async () => {
    addSubscription(makePushSub('https://push.example.com/ep-1'), {
      categories: ['live-music'],
      frequency: 'daily-digest',
    });
    addSubscription(makePushSub('https://push.example.com/ep-2'), {
      categories: ['sport'],
      frequency: 'daily-digest',
    });
    const send = vi.fn<SendFn>().mockResolvedValue(undefined);
    const events = [
      makeEvent({ id: 'e1', category: 'live-music' }),
      makeEvent({ id: 'e2', category: 'sport' }),
    ];
    const results = await runDailyDigest(events, undefined, send);
    expect(results).toHaveLength(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect(results.every(r => r.sent)).toBe(true);
  });

  it('calls sendFn with the correct subscription and payload', async () => {
    const subData = makePushSub('https://push.example.com/ep-test');
    addSubscription(subData, { categories: ['live-music'], frequency: 'daily-digest' });
    const send = vi.fn<SendFn>().mockResolvedValue(undefined);
    await runDailyDigest([makeEvent()], undefined, send);
    const [calledSub, calledPayload] = send.mock.calls[0];
    expect(calledSub.subscription.endpoint).toBe('https://push.example.com/ep-test');
    expect(calledPayload.eventCount).toBe(1);
  });
});
