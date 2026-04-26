import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CmEvent, EventCategory } from './types';
import { semanticSearch } from './search/semantic-search';
import useAppSettings from './hooks/useAppSettings';
import useSmartSearch from './hooks/useSmartSearch';
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
import SettingsModal from './components/SettingsModal';

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

type PersistedFilterOptions = Omit<FilterOptions, 'searchQuery'>;

const FILTER_STORAGE_KEY = 'cmout-filter-preferences';

const EVENT_CATEGORIES: EventCategory[] = [
  'live-music',
  'theatre-comedy',
  'festival',
  'fitness-class',
  'community',
  'library',
  'church-faith',
  'sport',
  'kids',
  'pub-bar',
  'other',
];

const DATE_RANGES: DateRange[] = [
  'today',
  'tomorrow',
  'this-weekend',
  'this-week',
  'this-month',
  'custom',
  'all',
];

const defaultPersistedFilters: PersistedFilterOptions = {
  selectedCategories: defaultFilters.selectedCategories,
  dateRange: defaultFilters.dateRange,
  customDate: defaultFilters.customDate,
  selectedVenues: defaultFilters.selectedVenues,
  selectedPromoters: defaultFilters.selectedPromoters,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function validCategoryArray(value: unknown): EventCategory[] {
  return validStringArray(value).filter((item): item is EventCategory =>
    EVENT_CATEGORIES.includes(item as EventCategory)
  );
}

function validDateRange(value: unknown): DateRange {
  return DATE_RANGES.includes(value as DateRange) ? (value as DateRange) : 'all';
}

export function loadPersistedFilters(): PersistedFilterOptions {
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!stored) return defaultPersistedFilters;

    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return defaultPersistedFilters;

    return {
      selectedCategories: validCategoryArray(parsed.selectedCategories),
      dateRange: validDateRange(parsed.dateRange),
      customDate: typeof parsed.customDate === 'string' ? parsed.customDate : '',
      selectedVenues: validStringArray(parsed.selectedVenues),
      selectedPromoters: validStringArray(parsed.selectedPromoters),
    };
  } catch {
    return defaultPersistedFilters;
  }
}

function savePersistedFilters(filters: PersistedFilterOptions) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

export function isInDateRange(event: CmEvent, range: DateRange, customDate: string): boolean {
  const now = new Date();
  const start = event.startDate;

  if (range === 'all') return true;

  if (range === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    if (start >= todayStart && start < tomorrowStart) {
      return event.endDate ? event.endDate >= now : start >= now;
    }
    if (start < todayStart && event.endDate && event.endDate >= now) return true;
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
      friday.setDate(friday.getDate() - 7);
    } else if (day === 0) {
      friday.setDate(friday.getDate() - 7);
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
    if (start >= startOfWeek && start < endOfWeek) return true;
    if (start < startOfWeek && event.endDate && event.endDate >= startOfWeek) return true;
    return false;
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

/**
 * Filter events. When semanticResults is provided (from semantic search),
 * those are used as the candidate set (already in relevance order) instead
 * of doing substring matching. Other filters still apply on top.
 */
export function filterEvents(
  events: CmEvent[],
  options: FilterOptions,
  semanticResults?: CmEvent[]
): CmEvent[] {
  const query = options.searchQuery.toLowerCase();

  // If semantic results provided, use those as the source (preserving relevance order)
  const source = semanticResults ?? events;

  return source.filter(event => {
    // When we have semantic results, the search is already handled.
    // When we don't, fall back to substring matching.
    const matchesSearch =
      semanticResults != null ||
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
  const initialFilters = useMemo(loadPersistedFilters, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(
    initialFilters.selectedCategories
  );
  const [dateRange, setDateRange] = useState<DateRange>(initialFilters.dateRange);
  const [customDate, setCustomDate] = useState(initialFilters.customDate);
  const [selectedVenues, setSelectedVenues] = useState<string[]>(initialFilters.selectedVenues);
  const [selectedPromoters, setSelectedPromoters] = useState<string[]>(
    initialFilters.selectedPromoters
  );
  const [selectedEvent, setSelectedEvent] = useState<CmEvent | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const { settings, setTheme, setFontSize } = useAppSettings();
  const { phase, embeddings, modelReady, onQueryStart, acceptSmartSearch, declineSmartSearch } =
    useSmartSearch();
  const [semanticResults, setSemanticResults] = useState<CmEvent[] | undefined>(undefined);
  const prevQueryRef = useRef('');

  useEffect(() => {
    fetch('/events.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
        return res.json() as Promise<{ events: RawEvent[] }>;
      })
      .then(eventsData => {
        setEvents(eventsData.events.map(hydrateEvent));
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load events');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    savePersistedFilters({
      selectedCategories,
      dateRange,
      customDate,
      selectedVenues,
      selectedPromoters,
    });
  }, [selectedCategories, dateRange, customDate, selectedVenues, selectedPromoters]);

  // Run semantic search when query changes and model is ready
  useEffect(() => {
    if (!searchQuery || !modelReady || !embeddings) {
      setSemanticResults(undefined);
      return;
    }

    let cancelled = false;
    semanticSearch(searchQuery, embeddings, events).then(results => {
      if (!cancelled) setSemanticResults(results);
    });

    return () => {
      cancelled = true;
    };
  }, [searchQuery, modelReady, embeddings, events]);

  const handleSearchChange = useCallback(
    (value: string) => {
      const wasEmpty = prevQueryRef.current === '';
      prevQueryRef.current = value;
      setSearchQuery(value);
      if (wasEmpty && value) {
        onQueryStart();
      }
    },
    [onQueryStart]
  );

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

  const filteredEvents = filterEvents(
    events,
    filterOptions,
    searchQuery && modelReady ? semanticResults : undefined
  );

  const totalFilterCount =
    selectedCategories.length +
    selectedVenues.length +
    selectedPromoters.length +
    (dateRange === 'all' ? 0 : 1);

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
      {settingsOpen && (
        <SettingsModal
          phase={phase}
          onAcceptSmartSearch={acceptSmartSearch}
          onDeclineSmartSearch={declineSmartSearch}
          onClose={() => setSettingsOpen(false)}
          theme={settings.theme}
          onSetTheme={setTheme}
          fontSize={settings.fontSize}
          onSetFontSize={setFontSize}
        />
      )}
      <header className="app__header">
        <h1 className="app__title">CmOut</h1>
        <p className="app__subtitle">Chelmsford Events</p>
        <button
          type="button"
          className="app__settings-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ⚙
        </button>
      </header>

      <main className="app__main">
        <aside className="app__filters">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            smartSearchPhase={phase}
            onAcceptSmartSearch={acceptSmartSearch}
            onDeclineSmartSearch={declineSmartSearch}
          />
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
