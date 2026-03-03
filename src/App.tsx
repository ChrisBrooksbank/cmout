import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CmEvent, EventCategory } from './types';
import CategoryFilter from './components/CategoryFilter';
import DateRangeFilter, { type DateRange } from './components/DateRangeFilter';
import EventDetail from './components/EventDetail';
import EventList from './components/EventList';
import FilterSection from './components/FilterSection';
import InstallPrompt from './components/InstallPrompt';
import ListFilter from './components/ListFilter';
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

export interface FilterOptions {
  searchQuery: string;
  selectedCategories: EventCategory[];
  dateRange: DateRange;
  customDate: string;
  selectedVenues: string[];
  selectedPromoters: string[];
}

export const defaultFilters: FilterOptions = {
  searchQuery: '',
  selectedCategories: [],
  dateRange: 'all',
  customDate: '',
  selectedVenues: [],
  selectedPromoters: [],
};

export function isInDateRange(event: CmEvent, range: DateRange, customDate: string): boolean {
  const now = new Date();
  const start = event.startDate;

  if (range === 'all') return true;

  if (range === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    if (start >= todayStart && start < tomorrowStart) return true;
    if (start < todayStart && event.endDate && event.endDate >= todayStart) return true;
    return false;
  }

  if (range === 'tomorrow') {
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const dayAfter = new Date(tomorrowStart);
    dayAfter.setDate(dayAfter.getDate() + 1);
    if (start >= tomorrowStart && start < dayAfter) return true;
    if (start < tomorrowStart && event.endDate && event.endDate >= tomorrowStart) return true;
    return false;
  }

  if (range === 'this-weekend') {
    // Friday 17:00 through Sunday 23:59
    const day = now.getDay(); // 0=Sun .. 6=Sat
    const daysUntilFriday = day <= 5 ? 5 - day : 6; // If Sun(0), next Fri is +5; Mon-Fri, same week
    const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
    friday.setHours(17, 0, 0, 0);
    // If it's already the weekend (Sat or Sun), use last Friday
    if (day === 6) {
      friday.setDate(friday.getDate() - 1);
    } else if (day === 0) {
      friday.setDate(friday.getDate() - 6);
    }
    const sundayEnd = new Date(friday);
    sundayEnd.setDate(friday.getDate() + 2);
    sundayEnd.setHours(23, 59, 59, 999);

    if (start >= friday && start <= sundayEnd) return true;
    if (start < friday && event.endDate && event.endDate >= friday) return true;
    return false;
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

  if (range === 'custom' && customDate) {
    const [year, month, day] = customDate.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day);
    const dayEnd = new Date(year, month - 1, day + 1);
    if (start >= dayStart && start < dayEnd) return true;
    if (start < dayStart && event.endDate && event.endDate >= dayStart) return true;
    return false;
  }

  return true;
}

export function filterEvents(events: CmEvent[], options: FilterOptions): CmEvent[] {
  const query = options.searchQuery.toLowerCase();
  return events.filter(event => {
    const matchesSearch =
      !query ||
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query);

    const matchesCategory =
      options.selectedCategories.length === 0 ||
      options.selectedCategories.includes(event.category);

    const matchesDate = isInDateRange(event, options.dateRange, options.customDate);

    const matchesVenue =
      options.selectedVenues.length === 0 || options.selectedVenues.includes(event.venue);

    const matchesPromoter =
      options.selectedPromoters.length === 0 ||
      (event.promoter !== null && options.selectedPromoters.includes(event.promoter));

    return matchesSearch && matchesCategory && matchesDate && matchesVenue && matchesPromoter;
  });
}

export default function App() {
  const [events, setEvents] = useState<CmEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customDate, setCustomDate] = useState('');
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [selectedPromoters, setSelectedPromoters] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CmEvent | null>(null);

  useEffect(() => {
    fetch('/events.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
        return res.json() as Promise<{ events: RawEvent[] }>;
      })
      .then(data => {
        setEvents(data.events.map(hydrateEvent));
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

  // Derive unique venues/promoters from all events (stable lists)
  const venueItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of events) {
      counts.set(ev.venue, (counts.get(ev.venue) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const promoterItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of events) {
      if (ev.promoter) {
        counts.set(ev.promoter, (counts.get(ev.promoter) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const filterOptions: FilterOptions = {
    searchQuery,
    selectedCategories,
    dateRange,
    customDate,
    selectedVenues,
    selectedPromoters,
  };

  const filteredEvents = filterEvents(events, filterOptions);

  const totalFilterCount =
    selectedCategories.length + selectedVenues.length + selectedPromoters.length;

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setDateRange('all');
    setCustomDate('');
    setSelectedVenues([]);
    setSelectedPromoters([]);
  };

  if (selectedEvent) {
    return <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
  }

  const categoryFilter = (
    <CategoryFilter
      selected={selectedCategories}
      onChange={setSelectedCategories}
      events={events}
    />
  );

  const venueFilter = (
    <ListFilter
      legend="Venues"
      items={venueItems}
      selected={selectedVenues}
      onChange={setSelectedVenues}
    />
  );

  const promoterFilter = (
    <ListFilter
      legend="Promoters"
      items={promoterItems}
      selected={selectedPromoters}
      onChange={setSelectedPromoters}
    />
  );

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
          <DateRangeFilter
            selected={dateRange}
            onChange={setDateRange}
            customDate={customDate}
            onCustomDateChange={setCustomDate}
          />
          <FilterSection label="Categories" activeCount={selectedCategories.length}>
            {categoryFilter}
          </FilterSection>
          <FilterSection label="Venues" activeCount={selectedVenues.length}>
            {venueFilter}
          </FilterSection>
          <FilterSection label="Promoters" activeCount={selectedPromoters.length}>
            {promoterFilter}
          </FilterSection>
          {totalFilterCount > 0 && (
            <button type="button" className="filter-clear-all" onClick={clearAllFilters}>
              Clear all filters
            </button>
          )}
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
