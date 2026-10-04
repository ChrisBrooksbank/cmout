import type { CmEvent, EventCategory } from '../types';
import { formatWhen } from '../format';

export const CATEGORY_LABELS: Record<EventCategory, string> = {
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

interface EventCardProps {
  event: CmEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const { title, startDate, endDate, venue, category, price, imageUrl } = event;

  return (
    <article className="event-card" data-category={category}>
      {imageUrl && <img src={imageUrl} alt={title} className="event-card__image" loading="lazy" />}
      <div className="event-card__body">
        <span className="event-card__category">{CATEGORY_LABELS[category]}</span>
        <h3 className="event-card__title">{title}</h3>
        <p className="event-card__date">
          <time dateTime={startDate.toISOString()}>{formatWhen(startDate, endDate)}</time>
        </p>
        <p className="event-card__venue">{venue}</p>
        {price !== null && <p className="event-card__price">{price}</p>}
      </div>
    </article>
  );
}
