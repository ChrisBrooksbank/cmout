import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  genreToCategory,
  detailToEvents,
  parseDetailPage,
  parsePerformanceDateTime,
} from './chelmsford-theatre.js';
import type { DetailInfo } from './chelmsford-theatre.js';

describe('genreToCategory', () => {
  it('maps Drama to theatre-comedy', () => {
    expect(genreToCategory('Drama')).toBe('theatre-comedy');
  });

  it('maps Musicals to live-music', () => {
    expect(genreToCategory('Musicals')).toBe('live-music');
  });

  it('maps Comedy to theatre-comedy', () => {
    expect(genreToCategory('Comedy')).toBe('theatre-comedy');
  });

  it('maps Children to kids', () => {
    expect(genreToCategory('Children')).toBe('kids');
  });

  it('maps Family to kids', () => {
    expect(genreToCategory('Family')).toBe('kids');
  });

  it('maps Concert to live-music', () => {
    expect(genreToCategory('Concert')).toBe('live-music');
  });

  it('maps Pantomime to theatre-comedy', () => {
    expect(genreToCategory('Pantomime')).toBe('theatre-comedy');
  });

  it('maps unknown genre to other', () => {
    expect(genreToCategory('Special Event')).toBe('other');
  });
});

describe('parsePerformanceDateTime', () => {
  it('parses a valid date and time', () => {
    const result = parsePerformanceDateTime('Wed 4 Mar 2026', '14:30');
    expect(result).toEqual(new Date(2026, 2, 4, 14, 30, 0, 0));
  });

  it('parses evening time', () => {
    const result = parsePerformanceDateTime('Sat 25 Apr 2026', '19:30');
    expect(result).toEqual(new Date(2026, 3, 25, 19, 30, 0, 0));
  });

  it('returns null for invalid date string', () => {
    expect(parsePerformanceDateTime('not a date', '14:30')).toBeNull();
  });

  it('returns null for invalid time string', () => {
    expect(parsePerformanceDateTime('Wed 4 Mar 2026', 'noon')).toBeNull();
  });
});

describe('detailToEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T00:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseDetail: DetailInfo = {
    title: 'The Constant Wife',
    performances: [
      { date: 'Wed 4 Mar 2026', time: '14:30' },
      { date: 'Wed 4 Mar 2026', time: '19:30' },
      { date: 'Thu 5 Mar 2026', time: '19:30' },
    ],
    price: '£10.00-£46.50',
    description: 'A sharp and sophisticated comedy by W. Somerset Maugham.',
    imageUrl: 'https://www.chelmsfordtheatre.co.uk/media/hero.jpg',
    genre: 'Drama',
    sourceUrl: 'https://www.chelmsfordtheatre.co.uk/event/the-constant-wife',
  };

  it('creates one event per performance', () => {
    const events = detailToEvents(baseDetail);
    expect(events).toHaveLength(3);
  });

  it('sets correct start times', () => {
    const events = detailToEvents(baseDetail);
    expect(events[0].startDate).toEqual(new Date(2026, 2, 4, 14, 30, 0, 0));
    expect(events[1].startDate).toEqual(new Date(2026, 2, 4, 19, 30, 0, 0));
    expect(events[2].startDate).toEqual(new Date(2026, 2, 5, 19, 30, 0, 0));
  });

  it('sets venue and address correctly', () => {
    const events = detailToEvents(baseDetail);
    expect(events[0].venue).toBe('Chelmsford Theatre');
    expect(events[0].address).toBe('Fairfield Road, Chelmsford, Essex CM1 1JG');
  });

  it('sets source to chelmsford-theatre', () => {
    const events = detailToEvents(baseDetail);
    expect(events[0].source).toBe('chelmsford-theatre');
  });

  it('sets promoter to Chelmsford Theatre', () => {
    const events = detailToEvents(baseDetail);
    expect(events[0].promoter).toBe('Chelmsford Theatre');
  });

  it('maps genre to category', () => {
    const events = detailToEvents(baseDetail);
    expect(events[0].category).toBe('theatre-comedy');
  });

  it('passes price and description through', () => {
    const events = detailToEvents(baseDetail);
    expect(events[0].price).toBe('£10.00-£46.50');
    expect(events[0].description).toBe('A sharp and sophisticated comedy by W. Somerset Maugham.');
  });

  it('passes imageUrl through', () => {
    const events = detailToEvents(baseDetail);
    expect(events[0].imageUrl).toBe('https://www.chelmsfordtheatre.co.uk/media/hero.jpg');
  });

  it('sets latitude and longitude', () => {
    const events = detailToEvents(baseDetail);
    expect(events[0].latitude).toBeCloseTo(51.7361, 3);
    expect(events[0].longitude).toBeCloseTo(0.4723, 3);
  });

  it('filters out past performances', () => {
    const detail: DetailInfo = {
      ...baseDetail,
      performances: [
        { date: 'Mon 23 Feb 2026', time: '19:30' }, // past
        { date: 'Wed 4 Mar 2026', time: '14:30' }, // future
      ],
    };
    const events = detailToEvents(detail);
    expect(events).toHaveLength(1);
    expect(events[0].startDate.getMonth()).toBe(2); // March
  });

  it('defaults to other category when no genre', () => {
    const detail: DetailInfo = { ...baseDetail, genre: null };
    const events = detailToEvents(detail);
    expect(events[0].category).toBe('other');
  });
});

describe('parseDetailPage', () => {
  it('extracts title, performances, price, genre from HTML', () => {
    const html = `
      <html><body>
        <h1>Test Show</h1>
        <p><strong>Genre:</strong> Drama</p>
        <p><strong>Tickets:</strong> £15.00 - £30.00</p>
        <h4>Wed 4 Mar 2026</h4>
        <a href="/performance?id=1">14:30 - Tickets Available</a>
        <a href="/performance?id=2">19:30 - Tickets Available</a>
        <h4>Thu 5 Mar 2026</h4>
        <a href="/performance?id=3">19:30 - Limited Availability</a>
        <img src="/media/test-image.jpg" alt="Test">
        <p>This is a long enough description paragraph that should be captured by the scraper for display.</p>
      </body></html>
    `;

    const result = parseDetailPage(html, 'https://www.chelmsfordtheatre.co.uk/event/test-show');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Test Show');
    expect(result!.genre).toBe('Drama');
    expect(result!.price).toBe('£15.00-£30.00');
    expect(result!.performances).toHaveLength(3);
    expect(result!.performances[0]).toEqual({ date: 'Wed 4 Mar 2026', time: '14:30' });
    expect(result!.performances[1]).toEqual({ date: 'Wed 4 Mar 2026', time: '19:30' });
    expect(result!.performances[2]).toEqual({ date: 'Thu 5 Mar 2026', time: '19:30' });
    expect(result!.imageUrl).toBe('https://www.chelmsfordtheatre.co.uk/media/test-image.jpg');
  });

  it('returns null when no h1 title found', () => {
    const html = '<html><body><p>No title here</p></body></html>';
    const result = parseDetailPage(html, 'https://example.com');
    expect(result).toBeNull();
  });
});
