import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './semantic-search';
import type { CmEvent } from '../types';

function makeEvent(overrides: Partial<CmEvent> = {}): CmEvent {
  return {
    id: 'evt-1',
    title: 'Test Event',
    description: 'A test event',
    startDate: new Date('2026-03-10T10:00:00Z'),
    endDate: null,
    venue: 'Test Venue',
    address: '1 Test St',
    category: 'community',
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

describe('cosineSimilarity', () => {
  it('returns 1 for identical normalised vectors', () => {
    const v = new Float32Array([0.6, 0.8]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite normalised vectors', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([-1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('works with number[] inputs', () => {
    const a = [0.6, 0.8];
    const b = [0.6, 0.8];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('handles higher-dimensional vectors', () => {
    // Two normalised 384-dim-like vectors (just test with 4 dims)
    const a = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const b = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });
});

describe('semantic search types', () => {
  it('Embeddings interface matches expected shape', () => {
    const embeddings = {
      eventIds: ['evt-1', 'evt-2'],
      vectors: [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ],
    };
    expect(embeddings.eventIds).toHaveLength(2);
    expect(embeddings.vectors[0]).toHaveLength(3);
  });

  it('makeEvent helper produces valid CmEvent', () => {
    const ev = makeEvent({ id: 'test', title: 'Test' });
    expect(ev.id).toBe('test');
    expect(ev.title).toBe('Test');
  });
});
