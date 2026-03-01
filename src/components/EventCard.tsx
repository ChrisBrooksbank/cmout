import type { CmEvent, EventCategory } from '../types';

const CATEGORY_LABELS: Record<EventCategory, string> = {
  'live-music': 'Live Music',
  'theatre-comedy': 'Theatre & Comedy',
  festival: 'Festival',
  'fitness-class': 'Fitness',
  community: 'Community',
  library: 'Library',
  'church-faith': 'Faith',
  sport: 'Sport',
  kids: 'Kids',
  'pub-bar': 'Pub & Bar',
  other: 'Other',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

interface EventCardProps {
  event: CmEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const { title, startDate, endDate, venue, category, price, imageUrl } = event;

  return (
    <article className="event-card" data-category={category}>
      {imageUrl && <img src={imageUrl} alt={title} className="event-card__image" />}
      <div className="event-card__body">
        <span className="event-card__category">{CATEGORY_LABELS[category]}</span>
        <h2 className="event-card__title">{title}</h2>
        <p className="event-card__date">
          <time dateTime={startDate.toISOString()}>
            {formatDate(startDate)} at {formatTime(startDate)}
          </time>
          {endDate && (
            <>
              {' '}
              – <time dateTime={endDate.toISOString()}>{formatTime(endDate)}</time>
            </>
          )}
        </p>
        <p className="event-card__venue">{venue}</p>
        {price !== null && <p className="event-card__price">{price}</p>}
      </div>
    </article>
  );
}
