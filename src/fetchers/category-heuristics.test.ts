import { describe, it, expect } from 'vitest';
import { mapCategory as outsavvyCategory } from './outsavvy.js';
import { mapCategory as seeticketsCategory } from './seetickets.js';

describe('Outsavvy category heuristics', () => {
  it('does not match keywords inside longer words', () => {
    expect(outsavvyCategory('Sunday Brunch', '')).not.toBe('fitness-class');
    expect(outsavvyCategory('Public lecture on recycling', '')).not.toBe('pub-bar');
    expect(outsavvyCategory('Classic car show', '')).toBe('other');
  });

  it('still matches whole keywords', () => {
    expect(outsavvyCategory('Park Run', '')).toBe('fitness-class');
    expect(outsavvyCategory('Pub Quiz', '')).toBe('pub-bar');
    expect(outsavvyCategory('Christmas Craft Fair', '')).toBe('festival');
  });
});

describe('See Tickets category heuristics', () => {
  it('does not match keywords inside longer words', () => {
    expect(seeticketsCategory('Amazing Grace', '')).not.toBe('sport');
    expect(seeticketsCategory('A Love Affair', '')).not.toBe('festival');
  });

  it('still matches whole keywords', () => {
    expect(seeticketsCategory('Ladies Day Race Meeting', '')).toBe('sport');
    expect(seeticketsCategory('Tribute Band Night', '')).toBe('live-music');
  });
});
