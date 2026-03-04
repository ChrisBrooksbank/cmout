import { describe, it, expect } from 'vitest';
import { composeText } from './generate.js';
import type { SerializedCmEvent } from '../build-events.js';

function makeSerializedEvent(overrides: Partial<SerializedCmEvent> = {}): SerializedCmEvent {
  return {
    id: 'evt-1',
    title: 'Jazz Night',
    description: 'Live jazz at the civic centre',
    startDate: '2026-03-10T19:00:00.000Z',
    endDate: null,
    venue: 'Civic Centre',
    address: '123 Main St',
    category: 'live-music',
    source: 'openactive',
    sourceUrl: 'https://example.com/event/1',
    latitude: 51.736,
    longitude: 0.469,
    imageUrl: null,
    price: null,
    promoter: null,
    ...overrides,
  };
}

describe('composeText', () => {
  it('combines title, category, venue and description', () => {
    const text = composeText(makeSerializedEvent());
    expect(text).toBe('Jazz Night. live-music. Civic Centre. Live jazz at the civic centre');
  });

  it('omits empty description', () => {
    const text = composeText(makeSerializedEvent({ description: '' }));
    expect(text).toBe('Jazz Night. live-music. Civic Centre');
  });

  it('omits empty venue', () => {
    const text = composeText(makeSerializedEvent({ venue: '' }));
    expect(text).toBe('Jazz Night. live-music. Live jazz at the civic centre');
  });

  it('always includes title first', () => {
    const text = composeText(makeSerializedEvent({ title: 'Art Show' }));
    expect(text.startsWith('Art Show')).toBe(true);
  });
});
