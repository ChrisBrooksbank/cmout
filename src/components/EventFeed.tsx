import { useState } from 'react';

import type { CmEvent } from '../types';
import { formatDayHeading } from '../format';
import type { DaySection, FeedItem } from '../listing';
import EventCard from './EventCard';
import SessionGroupCard from './SessionGroupCard';

const INITIAL_DAYS = 7;
const MORE_DAYS = 7;

interface EventFeedProps {
  sections: DaySection[];
  onSelect: (event: CmEvent) => void;
  /** Show leisure-centre sessions inline rather than collapsed (e.g. when filtering for them). */
  expandSessions?: boolean;
  onClearFilters?: () => void;
}

function FeedItems({ items, onSelect }: { items: FeedItem[]; onSelect: (event: CmEvent) => void }) {
  return (
    <ul className="event-list">
      {items.map(item => (
        <li key={item.key} className="event-list__item">
          {item.kind === 'event' ? (
            <button
              className="event-list__item-button"
              onClick={() => onSelect(item.event)}
              aria-label={`View details for ${item.event.title}`}
            >
              <EventCard event={item.event} />
            </button>
          ) : (
            <SessionGroupCard events={item.events} onSelect={onSelect} />
          )}
        </li>
      ))}
    </ul>
  );
}

function sessionCount(items: FeedItem[]): number {
  return items.reduce((n, item) => n + (item.kind === 'event' ? 1 : item.events.length), 0);
}

/** Leisure-centre sessions, collapsed by default and only rendered once opened. */
function SessionsDisclosure({
  items,
  onSelect,
}: {
  items: FeedItem[];
  onSelect: (event: CmEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="event-feed__sessions"
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="event-feed__sessions-summary">
        Sports &amp; fitness sessions
        <span className="event-feed__sessions-count">
          {items.length} {items.length === 1 ? 'activity' : 'activities'} · {sessionCount(items)}{' '}
          sessions
        </span>
      </summary>
      {open && <FeedItems items={items} onSelect={onSelect} />}
    </details>
  );
}

export default function EventFeed({
  sections,
  onSelect,
  expandSessions = false,
  onClearFilters,
}: EventFeedProps) {
  const [visibleDays, setVisibleDays] = useState(INITIAL_DAYS);

  if (sections.length === 0) {
    return (
      <div className="event-list__empty">
        <p>No events found. Try adjusting your filters.</p>
        {onClearFilters && (
          <button type="button" className="filter-clear-all" onClick={onClearFilters}>
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="event-feed">
      {sections.slice(0, visibleDays).map(section => {
        const headingId = `day-${section.key}`;
        return (
          <section key={section.key} className="event-feed__day" aria-labelledby={headingId}>
            <h2 id={headingId} className="event-feed__day-heading">
              {formatDayHeading(section.date)}
              <span className="event-feed__day-count">
                {section.eventCount} {section.eventCount === 1 ? 'event' : 'events'}
              </span>
            </h2>
            {section.highlights.length > 0 && (
              <FeedItems items={section.highlights} onSelect={onSelect} />
            )}
            {section.sessions.length > 0 &&
              (expandSessions ? (
                <FeedItems items={section.sessions} onSelect={onSelect} />
              ) : (
                <SessionsDisclosure items={section.sessions} onSelect={onSelect} />
              ))}
          </section>
        );
      })}
      {sections.length > visibleDays && (
        <button
          type="button"
          className="event-feed__more"
          onClick={() => setVisibleDays(n => n + MORE_DAYS)}
        >
          Show more days
        </button>
      )}
    </div>
  );
}
