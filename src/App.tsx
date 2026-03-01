import { useCallback, useEffect, useState } from 'react';

import type { CmEvent, EventCategory } from './types';
import CategoryFilter from './components/CategoryFilter';
import DateRangeFilter, { type DateRange } from './components/DateRangeFilter';
import EventDetail from './components/EventDetail';
import EventList from './components/EventList';
import InstallPrompt from './components/InstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import PushNotificationPrompt from './components/PushNotificationPrompt';
import SearchBar from './components/SearchBar';

interface RawEvent extends Omit<CmEvent, 'startDate' | 'endDate'> {
  startDate: string;
  endDate: string | null;
}

function hydrateEvent(raw: RawEvent): CmEvent {
  return {
    ...raw,
    startDate: new Date(raw.startDate),
    endDate: raw.endDate ? new Date(raw.endDate) : null,
  };
}

function isInDateRange(event: CmEvent, range: DateRange): boolean {
  const now = new Date();
  const start = event.startDate;

  if (range === 'all') return true;

  if (range === 'today') {
    return (
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate()
    );
  }

  if (range === 'this-week') {
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return start >= startOfWeek && start < endOfWeek;
  }

  if (range === 'this-month') {
    return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
  }

  return true;
}

export function filterEvents(
  events: CmEvent[],
  searchQuery: string,
  selectedCategories: EventCategory[],
  dateRange: DateRange
): CmEvent[] {
  const query = searchQuery.toLowerCase();
  return events.filter(event => {
    const matchesSearch =
      !query ||
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query);

    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(event.category);

    const matchesDate = isInDateRange(event, dateRange);

    return matchesSearch && matchesCategory && matchesDate;
  });
}

export default function App() {
  const [events, setEvents] = useState<CmEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedEvent, setSelectedEvent] = useState<CmEvent | null>(null);

  useEffect(() => {
    fetch('/events.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
        return res.json() as Promise<RawEvent[]>;
      })
      .then(data => {
        setEvents(data.map(hydrateEvent));
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load events');
        setLoading(false);
      });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const filteredEvents = filterEvents(events, searchQuery, selectedCategories, dateRange);

  if (selectedEvent) {
    return <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
  }

  return (
    <div className="app">
      <OfflineIndicator />
      <InstallPrompt />
      <PushNotificationPrompt />
      <header className="app__header">
        <h1 className="app__title">CmOut</h1>
        <p className="app__subtitle">Chelmsford Events</p>
      </header>

      <main className="app__main">
        <aside className="app__filters">
          <SearchBar value={searchQuery} onChange={handleSearchChange} />
          <DateRangeFilter selected={dateRange} onChange={setDateRange} />
          <CategoryFilter selected={selectedCategories} onChange={setSelectedCategories} />
        </aside>

        <section className="app__content" aria-label="Events">
          {loading && (
            <p className="app__loading" role="status">
              Loading events…
            </p>
          )}
          {error && (
            <p className="app__error" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && <EventList events={filteredEvents} onSelect={setSelectedEvent} />}
        </section>
      </main>
    </div>
  );
}
