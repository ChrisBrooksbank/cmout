import type { CmEvent } from '../types';
import EventCard from './EventCard';

interface EventListProps {
  events: CmEvent[];
  onSelect?: (event: CmEvent) => void;
}

export default function EventList({ events, onSelect }: EventListProps) {
  if (events.length === 0) {
    return <p className="event-list__empty">No events found. Try adjusting your filters.</p>;
  }

  return (
    <ul className="event-list" aria-label="Events">
      {events.map(event => (
        <li key={event.id} className="event-list__item">
          {onSelect ? (
            <button
              className="event-list__item-button"
              onClick={() => onSelect(event)}
              aria-label={`View details for ${event.title}`}
            >
              <EventCard event={event} />
            </button>
          ) : (
            <EventCard event={event} />
          )}
        </li>
      ))}
    </ul>
  );
}
