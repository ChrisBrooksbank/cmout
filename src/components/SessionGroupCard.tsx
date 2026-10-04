import type { CmEvent } from '../types';
import { formatTime, hasKnownTime } from '../format';
import { CATEGORY_LABELS } from './EventCard';

interface SessionGroupCardProps {
  /** Sessions of the same activity at the same venue on one day, in time order. */
  events: CmEvent[];
  onSelect: (event: CmEvent) => void;
}

/** One card for repeat sessions (e.g. "Lane Swimming" six times a day), with a button per time. */
export default function SessionGroupCard({ events, onSelect }: SessionGroupCardProps) {
  const [first] = events;
  const prices = new Set(events.map(e => e.price).filter(Boolean));

  return (
    <article className="event-card session-card" data-category={first.category}>
      <div className="event-card__body">
        <span className="event-card__category">{CATEGORY_LABELS[first.category]}</span>
        <h3 className="event-card__title">{first.title}</h3>
        <p className="event-card__venue">{first.venue}</p>
        <div
          className="session-card__times"
          role="group"
          aria-label={`${events.length} sessions of ${first.title}`}
        >
          {events.map(event => (
            <button
              key={event.id}
              type="button"
              className="session-card__time"
              onClick={() => onSelect(event)}
              aria-label={`${first.title} at ${formatTime(event.startDate)}`}
            >
              {hasKnownTime(event.startDate) ? formatTime(event.startDate) : 'Any time'}
            </button>
          ))}
        </div>
        {prices.size === 1 && <p className="event-card__price">{[...prices][0]}</p>}
      </div>
    </article>
  );
}
