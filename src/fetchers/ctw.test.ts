import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseDateRange, parseTime, showToEvents } from './ctw.js';
import type { ShowInfo } from './ctw.js';

describe('parseDateRange', () => {
  it('parses a date range with ordinal suffixes and en-dash', () => {
    const dates = parseDateRange('19th – 23rd May 2026');
    expect(dates).toHaveLength(5);
    expect(dates[0].getFullYear()).toBe(2026);
    expect(dates[0].getMonth()).toBe(4); // May = 4
    expect(dates[0].getDate()).toBe(19);
    expect(dates[4].getDate()).toBe(23);
  });

  it('parses a date range with HTML entity en-dash', () => {
    const dates = parseDateRange('21st &#8211; 25th April 2026');
    expect(dates).toHaveLength(5);
    expect(dates[0].getMonth()).toBe(3); // April = 3
    expect(dates[0].getDate()).toBe(21);
    expect(dates[4].getDate()).toBe(25);
  });

  it('parses a date range with plain hyphen', () => {
    const dates = parseDateRange('17th - 21st February 2026');
    expect(dates).toHaveLength(5);
    expect(dates[0].getMonth()).toBe(1); // February = 1
    expect(dates[0].getDate()).toBe(17);
    expect(dates[4].getDate()).toBe(21);
  });

  it('parses a single date', () => {
    const dates = parseDateRange('5th March 2026');
    expect(dates).toHaveLength(1);
    expect(dates[0].getMonth()).toBe(2); // March = 2
    expect(dates[0].getDate()).toBe(5);
  });

  it('returns empty array for unrecognised text', () => {
    expect(parseDateRange('no dates here')).toHaveLength(0);
    expect(parseDateRange('')).toHaveLength(0);
  });
});

describe('parseTime', () => {
  it('parses time with period separator and pm', () => {
    const result = parseTime('7.45pm');
    expect(result).toEqual({ hours: 19, minutes: 45 });
  });

  it('parses time with colon separator and pm', () => {
    const result = parseTime('2:30pm');
    expect(result).toEqual({ hours: 14, minutes: 30 });
  });

  it('parses am time', () => {
    const result = parseTime('10.00am');
    expect(result).toEqual({ hours: 10, minutes: 0 });
  });

  it('handles 12pm as noon', () => {
    const result = parseTime('12.00pm');
    expect(result).toEqual({ hours: 12, minutes: 0 });
  });

  it('handles 12am as midnight', () => {
    const result = parseTime('12.00am');
    expect(result).toEqual({ hours: 0, minutes: 0 });
  });

  it('returns null for unrecognised text', () => {
    expect(parseTime('no time here')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});

describe('showToEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T00:00:00'));
  });

  const baseShow: ShowInfo = {
    title: 'April in Paris',
    dates: [
      new Date(2026, 3, 21), // Tue Apr 21
      new Date(2026, 3, 22), // Wed Apr 22
      new Date(2026, 3, 23), // Thu Apr 23
      new Date(2026, 3, 24), // Fri Apr 24
      new Date(2026, 3, 25), // Sat Apr 25
    ],
    eveningTime: { hours: 19, minutes: 45 },
    matineeTime: null,
    hasMatinee: false,
    description: 'A comedy by John Godber',
    price: '£15.09',
    sourceUrl: 'https://ctw.org.uk/auditions-april-in-paris/',
  };

  it('creates one event per date for evening-only shows', () => {
    const events = showToEvents(baseShow);
    expect(events).toHaveLength(5);
  });

  it('sets correct start time on events', () => {
    const events = showToEvents(baseShow);
    expect(events[0].startDate.getHours()).toBe(19);
    expect(events[0].startDate.getMinutes()).toBe(45);
  });

  it('sets venue and address correctly', () => {
    const events = showToEvents(baseShow);
    expect(events[0].venue).toBe('The Old Court Theatre');
    expect(events[0].address).toBe('233 Springfield Road, Chelmsford, CM2 6JT');
  });

  it('sets category to theatre-comedy', () => {
    const events = showToEvents(baseShow);
    expect(events[0].category).toBe('theatre-comedy');
  });

  it('sets source to ctw', () => {
    const events = showToEvents(baseShow);
    expect(events[0].source).toBe('ctw');
  });

  it('sets promoter to Chelmsford Theatre Workshop', () => {
    const events = showToEvents(baseShow);
    expect(events[0].promoter).toBe('Chelmsford Theatre Workshop');
  });

  it('includes Saturday matinee when configured', () => {
    const showWithMatinee: ShowInfo = {
      ...baseShow,
      matineeTime: { hours: 14, minutes: 30 },
      hasMatinee: true,
    };
    const events = showToEvents(showWithMatinee);
    // 5 evenings + 1 Saturday matinee = 6
    expect(events).toHaveLength(6);
    const matinee = events.find(e => e.title.includes('Matinee'));
    expect(matinee).toBeDefined();
    expect(matinee!.startDate.getHours()).toBe(14);
    expect(matinee!.startDate.getMinutes()).toBe(30);
    expect(matinee!.startDate.getDay()).toBe(6); // Saturday
  });

  it('filters out past dates', () => {
    const showWithPastDates: ShowInfo = {
      ...baseShow,
      dates: [
        new Date(2026, 1, 17), // Feb 17 - past
        new Date(2026, 1, 18), // Feb 18 - past
        new Date(2026, 3, 21), // Apr 21 - future
      ],
    };
    const events = showToEvents(showWithPastDates);
    expect(events).toHaveLength(1);
    expect(events[0].startDate.getMonth()).toBe(3); // April
  });

  it('passes price and description through', () => {
    const events = showToEvents(baseShow);
    expect(events[0].price).toBe('£15.09');
    expect(events[0].description).toBe('A comedy by John Godber');
  });

  it('sets latitude and longitude', () => {
    const events = showToEvents(baseShow);
    expect(events[0].latitude).toBeCloseTo(51.7375, 3);
    expect(events[0].longitude).toBeCloseTo(0.4878, 3);
  });
});
