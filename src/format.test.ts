import { describe, expect, it } from 'vitest';
import { formatDayHeading, formatShortDate, formatWhen } from './format';

const now = new Date(2026, 9, 4, 10, 0); // Sun 4 Oct 2026, 10:00 local

describe('formatShortDate', () => {
  it('uses Today and Tomorrow', () => {
    expect(formatShortDate(new Date(2026, 9, 4, 20, 0), now)).toBe('Today');
    expect(formatShortDate(new Date(2026, 9, 5, 9, 0), now)).toBe('Tomorrow');
  });

  it('omits the year for this year and includes it otherwise', () => {
    expect(formatShortDate(new Date(2026, 9, 10), now)).toBe('Sat 10 Oct');
    expect(formatShortDate(new Date(2027, 0, 2), now)).toBe('Sat 2 Jan 2027');
  });
});

describe('formatDayHeading', () => {
  it('spells out later days', () => {
    expect(formatDayHeading(new Date(2026, 9, 4, 23, 0), now)).toBe('Today');
    expect(formatDayHeading(new Date(2026, 9, 10), now)).toBe('Saturday 10 October');
  });
});

describe('formatWhen', () => {
  it('shows a same-day time range', () => {
    expect(formatWhen(new Date(2026, 9, 4, 19, 30), new Date(2026, 9, 4, 23, 0), { now })).toBe(
      'Today · 19:30–23:00'
    );
  });

  it('shows just the start time when there is no end', () => {
    expect(formatWhen(new Date(2026, 9, 10, 19, 30), null, { now })).toBe('Sat 10 Oct · 19:30');
  });

  it('shows only the date when the source has no start time', () => {
    expect(formatWhen(new Date(2026, 9, 10), null, { now })).toBe('Sat 10 Oct');
  });

  it('shows both dates for multi-day events', () => {
    expect(formatWhen(new Date(2026, 9, 10, 10, 0), new Date(2026, 9, 12, 17, 0), { now })).toBe(
      'Sat 10 Oct 10:00 – Mon 12 Oct 17:00'
    );
  });

  it('uses full names in long form', () => {
    expect(formatWhen(new Date(2026, 9, 10, 19, 30), null, { now, long: true })).toBe(
      'Saturday 10 October · 19:30'
    );
  });
});
