import type { CmEvent } from '../types';
import EventCard from './EventCard';

interface EventListProps {
  events: CmEvent[];
}

export default function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return <p className="event-list__empty">No events found. Try adjusting your filters.</p>;
  }

  return (
    <ul className="event-list" aria-label="Events">
      {events.map(event => (
        <li key={event.id} className="event-list__item">
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}
