import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import App, { filterEvents, isInDateRange, defaultFilters } from './App';
import type { FilterOptions } from './App';
import type { CmEvent } from './types';

const makeEvent = (overrides: Partial<CmEvent> = {}): CmEvent => ({
  id: 'evt-1',
  title: 'Test Concert',
  description: 'A great concert',
  startDate: new Date('2026-07-15T19:30:00Z'),
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
});

function mockFetch(events: CmEvent[]) {
  const raw = events.map(e => ({
    ...e,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate ? e.endDate.toISOString() : null,
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ events: raw }),
    })
  );
}

function mockFetchError(status = 500) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
    })
  );
}

function filters(overrides: Partial<FilterOptions> = {}): FilterOptions {
  return { ...defaultFilters, ...overrides };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('App', () => {
  it('renders header with title and subtitle', async () => {
    mockFetch([]);
    render(<App />);
    expect(screen.getByRole('heading', { name: /cmout/i })).toBeInTheDocument();
    expect(screen.getByText(/chelmsford events/i)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('renders events after successful fetch', async () => {
    mockFetch([makeEvent({ title: 'Jazz Night' })]);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /jazz night/i })).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    mockFetchError(500);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load events/i);
    });
  });

  it('shows error message when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
    });
  });

  it('hides loading state after fetch completes', async () => {
    mockFetch([]);
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('shows event detail when an event is selected', async () => {
    mockFetch([makeEvent({ title: 'Rock Festival', description: 'Amazing rock fest' })]);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /rock festival/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /view details for rock festival/i }));
    expect(screen.getByText(/more info \/ book tickets/i)).toBeInTheDocument();
  });

  it('navigates back from event detail to event list', async () => {
    mockFetch([makeEvent({ title: 'Art Show' })]);
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /view details for art show/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /view details for art show/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to events/i }));
    expect(screen.getByRole('heading', { name: /cmout/i })).toBeInTheDocument();
  });

  it('renders filter controls', async () => {
    mockFetch([]);
    render(<App />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /filter by date/i })).toBeInTheDocument();
  });
});

describe('filterEvents', () => {
  const events: CmEvent[] = [
    makeEvent({
      id: '1',
      title: 'Jazz Concert',
      category: 'live-music',
      description: 'Great jazz',
    }),
    makeEvent({ id: '2', title: 'Community Run', category: 'sport', description: 'Fun run' }),
    makeEvent({ id: '3', title: 'Art Exhibition', category: 'other', description: 'Local art' }),
  ];

  it('returns all events when no filters applied', () => {
    expect(filterEvents(events, filters())).toHaveLength(3);
  });

  it('filters by search query on title', () => {
    const result = filterEvents(events, filters({ searchQuery: 'jazz' }));
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Jazz Concert');
  });

  it('filters by search query on description', () => {
    const result = filterEvents(events, filters({ searchQuery: 'fun run' }));
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Community Run');
  });

  it('search is case-insensitive', () => {
    expect(filterEvents(events, filters({ searchQuery: 'JAZZ' }))).toHaveLength(1);
  });

  it('filters by single category', () => {
    const result = filterEvents(events, filters({ selectedCategories: ['sport'] }));
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Community Run');
  });

  it('filters by multiple categories', () => {
    const result = filterEvents(events, filters({ selectedCategories: ['live-music', 'sport'] }));
    expect(result).toHaveLength(2);
  });

  it('shows all events when selectedCategories is empty', () => {
    expect(filterEvents(events, filters())).toHaveLength(3);
  });

  it('combines search and category filters', () => {
    const result = filterEvents(
      events,
      filters({ searchQuery: 'jazz', selectedCategories: ['sport'] })
    );
    expect(result).toHaveLength(0);
  });

  it('filters by today date range', () => {
    const today = new Date();
    const todayEvent = makeEvent({ id: 'today', startDate: today });
    const futureEvent = makeEvent({
      id: 'future',
      startDate: new Date('2099-01-01T12:00:00Z'),
    });
    const result = filterEvents([todayEvent, futureEvent], filters({ dateRange: 'today' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('today');
  });

  it('today includes spanning events that started before today but end today or later', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const spanningEvent = makeEvent({
      id: 'spanning',
      startDate: yesterday,
      endDate: tomorrow,
    });
    const pastEvent = makeEvent({
      id: 'past',
      startDate: yesterday,
      endDate: yesterday,
    });
    const result = filterEvents([spanningEvent, pastEvent], filters({ dateRange: 'today' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('spanning');
  });

  it('date range all returns everything', () => {
    const pastEvent = makeEvent({ id: 'past', startDate: new Date('2020-01-01T12:00:00Z') });
    const futureEvent = makeEvent({ id: 'future', startDate: new Date('2099-01-01T12:00:00Z') });
    expect(filterEvents([pastEvent, futureEvent], filters())).toHaveLength(2);
  });

  it('filters by venue', () => {
    const eventsWithVenues = [
      makeEvent({ id: '1', venue: 'Riverside' }),
      makeEvent({ id: '2', venue: 'Civic Centre' }),
      makeEvent({ id: '3', venue: 'Riverside' }),
    ];
    const result = filterEvents(eventsWithVenues, filters({ selectedVenues: ['Riverside'] }));
    expect(result).toHaveLength(2);
  });

  it('filters by promoter', () => {
    const eventsWithPromoters = [
      makeEvent({ id: '1', promoter: 'Live Nation' }),
      makeEvent({ id: '2', promoter: 'Local Promo' }),
      makeEvent({ id: '3', promoter: null }),
    ];
    const result = filterEvents(
      eventsWithPromoters,
      filters({ selectedPromoters: ['Live Nation'] })
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes null promoter events when promoter filter is active', () => {
    const eventsWithPromoters = [
      makeEvent({ id: '1', promoter: null }),
      makeEvent({ id: '2', promoter: 'Some Promoter' }),
    ];
    const result = filterEvents(
      eventsWithPromoters,
      filters({ selectedPromoters: ['Some Promoter'] })
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('combines venue and category filters', () => {
    const mixed = [
      makeEvent({ id: '1', venue: 'Riverside', category: 'sport' }),
      makeEvent({ id: '2', venue: 'Riverside', category: 'live-music' }),
      makeEvent({ id: '3', venue: 'Civic Centre', category: 'sport' }),
    ];
    const result = filterEvents(
      mixed,
      filters({ selectedVenues: ['Riverside'], selectedCategories: ['sport'] })
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('isInDateRange', () => {
  it('tomorrow returns events starting tomorrow', () => {
    const now = new Date();
    const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0);
    const ev = makeEvent({ startDate: tomorrowDate });
    expect(isInDateRange(ev, 'tomorrow', '')).toBe(true);
  });

  it('tomorrow excludes events starting today', () => {
    const ev = makeEvent({ startDate: new Date() });
    expect(isInDateRange(ev, 'tomorrow', '')).toBe(false);
  });

  it('tomorrow includes spanning events covering tomorrow', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const ev = makeEvent({ startDate: yesterday, endDate: dayAfterTomorrow });
    expect(isInDateRange(ev, 'tomorrow', '')).toBe(true);
  });

  it('custom date filters to specific date', () => {
    const ev = makeEvent({ startDate: new Date('2026-06-15T14:00:00') });
    expect(isInDateRange(ev, 'custom', '2026-06-15')).toBe(true);
    expect(isInDateRange(ev, 'custom', '2026-06-16')).toBe(false);
  });

  it('custom date includes spanning events', () => {
    const ev = makeEvent({
      startDate: new Date('2026-06-14T10:00:00'),
      endDate: new Date('2026-06-16T18:00:00'),
    });
    expect(isInDateRange(ev, 'custom', '2026-06-15')).toBe(true);
  });

  it('this-weekend includes Saturday events', () => {
    // Set fake time to a Wednesday
    vi.setSystemTime(new Date('2026-03-04T10:00:00')); // Wednesday
    const saturday = new Date('2026-03-07T20:00:00');
    const ev = makeEvent({ startDate: saturday });
    expect(isInDateRange(ev, 'this-weekend', '')).toBe(true);
  });

  it('this-weekend excludes Thursday events', () => {
    vi.setSystemTime(new Date('2026-03-04T10:00:00')); // Wednesday
    const thursday = new Date('2026-03-05T14:00:00');
    const ev = makeEvent({ startDate: thursday });
    expect(isInDateRange(ev, 'this-weekend', '')).toBe(false);
  });
});
