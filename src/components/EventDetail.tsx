import { useEffect } from 'react';
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

interface EventDetailProps {
  event: CmEvent;
  onBack: () => void;
}

export default function EventDetail({ event, onBack }: EventDetailProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const {
    title,
    description,
    startDate,
    endDate,
    venue,
    address,
    category,
    price,
    imageUrl,
    sourceUrl,
  } = event;

  return (
    <article className="event-detail" data-category={category}>
      <button className="event-detail__back" onClick={onBack} aria-label="Back to events">
        ← Back
      </button>

      {imageUrl && <img src={imageUrl} alt={title} className="event-detail__image" />}

      <div className="event-detail__body">
        <span className="event-detail__category">{CATEGORY_LABELS[category]}</span>
        <h1 className="event-detail__title">{title}</h1>

        <p className="event-detail__date">
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

        <p className="event-detail__venue">{venue}</p>
        {address && <p className="event-detail__address">{address}</p>}

        {price !== null && <p className="event-detail__price">{price}</p>}

        {description && <p className="event-detail__description">{description}</p>}

        <a
          href={sourceUrl}
          className="event-detail__source-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {sourceUrl.includes('gladstonego.cloud')
            ? 'Book at Chelmsford City Sports'
            : 'More info / Book tickets'}
        </a>
      </div>
    </article>
  );
}
