import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AggregateResult } from './aggregator.js';
import type { CmEvent } from './types.js';

vi.mock('./aggregator.js', () => ({
  aggregateEvents: vi.fn(),
}));

import { aggregateEvents } from './aggregator.js';
import { buildEventsJson } from './build-events.js';

const mockAggregateEvents = vi.mocked(aggregateEvents);

function makeEvent(overrides: Partial<CmEvent> = {}): CmEvent {
  return {
    id: 'evt-1',
    title: 'Test Event',
    description: 'A test event',
    startDate: new Date('2026-03-10T10:00:00Z'),
    endDate: new Date('2026-03-10T12:00:00Z'),
    venue: 'Test Venue',
    address: '1 Test St, Chelmsford',
    category: 'community',
    source: 'openactive',
    sourceUrl: 'https://example.com/event/1',
    latitude: 51.7356,
    longitude: 0.4685,
    imageUrl: null,
    price: null,
    promoter: null,
    ...overrides,
  };
}

function makeAggregateResult(events: CmEvent[]): AggregateResult {
  return {
    events,
    rawResults: [],
    totalRaw: events.length,
    totalDeduped: events.length,
    fetchedAt: new Date('2026-03-01T08:00:00Z'),
  };
}

/** Returns a unique temp file path; caller is responsible for cleanup */
function tempPath(): string {
  return join(tmpdir(), `cmout-test-${randomUUID()}.json`);
}

describe('buildEventsJson', () => {
  const tempFiles: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    for (const f of tempFiles.splice(0)) {
      await rm(f, { force: true });
    }
  });

  it('calls aggregateEvents with no arguments', async () => {
    mockAggregateEvents.mockResolvedValue(makeAggregateResult([]));
    const out = tempPath();
    tempFiles.push(out);

    await buildEventsJson(out);

    expect(mockAggregateEvents).toHaveBeenCalledOnce();
    expect(mockAggregateEvents).toHaveBeenCalledWith();
  });

  it('serialises startDate and endDate as ISO strings', async () => {
    mockAggregateEvents.mockResolvedValue(makeAggregateResult([makeEvent()]));
    const out = tempPath();
    tempFiles.push(out);

    const result = await buildEventsJson(out);

    expect(result.events[0].startDate).toBe('2026-03-10T10:00:00.000Z');
    expect(result.events[0].endDate).toBe('2026-03-10T12:00:00.000Z');
  });

  it('serialises null endDate as null', async () => {
    mockAggregateEvents.mockResolvedValue(makeAggregateResult([makeEvent({ endDate: null })]));
    const out = tempPath();
    tempFiles.push(out);

    const result = await buildEventsJson(out);

    expect(result.events[0].endDate).toBeNull();
  });

  it('sets fetchedAt as ISO string from aggregator result', async () => {
    mockAggregateEvents.mockResolvedValue(makeAggregateResult([]));
    const out = tempPath();
    tempFiles.push(out);

    const result = await buildEventsJson(out);

    expect(result.fetchedAt).toBe('2026-03-01T08:00:00.000Z');
  });

  it('sets totalEvents from totalDeduped', async () => {
    const events = [makeEvent({ id: '1' }), makeEvent({ id: '2' })];
    mockAggregateEvents.mockResolvedValue(makeAggregateResult(events));
    const out = tempPath();
    tempFiles.push(out);

    const result = await buildEventsJson(out);

    expect(result.totalEvents).toBe(2);
  });

  it('writes valid JSON to the output path', async () => {
    mockAggregateEvents.mockResolvedValue(makeAggregateResult([makeEvent()]));
    const out = tempPath();
    tempFiles.push(out);

    await buildEventsJson(out);

    const raw = await readFile(out, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0].title).toBe('Test Event');
    expect(parsed.totalEvents).toBe(1);
  });

  it('creates the output directory if it does not exist', async () => {
    mockAggregateEvents.mockResolvedValue(makeAggregateResult([]));
    const nested = join(tmpdir(), `cmout-test-${randomUUID()}`, 'sub', 'events.json');
    tempFiles.push(join(tmpdir(), nested.split('/').slice(-3)[0]));

    await expect(buildEventsJson(nested)).resolves.toBeDefined();

    const raw = await readFile(nested, 'utf-8');
    expect(JSON.parse(raw)).toHaveProperty('events');
    await rm(nested, { force: true });
  });

  it('preserves non-date event fields unchanged', async () => {
    const event = makeEvent({
      title: 'Chelmsford Concert',
      venue: 'Civic Theatre',
      category: 'live-music',
      price: '£10',
      imageUrl: 'https://example.com/img.jpg',
    });
    mockAggregateEvents.mockResolvedValue(makeAggregateResult([event]));
    const out = tempPath();
    tempFiles.push(out);

    const result = await buildEventsJson(out);

    const ev = result.events[0];
    expect(ev.title).toBe('Chelmsford Concert');
    expect(ev.venue).toBe('Civic Theatre');
    expect(ev.category).toBe('live-music');
    expect(ev.price).toBe('£10');
    expect(ev.imageUrl).toBe('https://example.com/img.jpg');
  });
});
