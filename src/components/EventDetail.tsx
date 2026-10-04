import { useEffect, useState } from 'react';
import type { CmEvent } from '../types';
import { buildIcs, directionsUrl } from '../calendar';
import { formatWhen } from '../format';
import { CATEGORY_LABELS } from './EventCard';

interface EventDetailProps {
  event: CmEvent;
  onBack: () => void;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'event'
  );
}

function downloadIcs(event: CmEvent) {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(event.title)}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EventDetail({ event, onBack }: EventDetailProps) {
  const [shareStatus, setShareStatus] = useState('');

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
  const when = formatWhen(startDate, endDate, { long: true });
  const directions = directionsUrl(event);

  async function handleShare() {
    const text = `${title} — ${when} at ${venue}`;
    const url = sourceUrl || window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareStatus('Link copied');
    } catch (err) {
      // Dismissing the share sheet rejects with AbortError — not a failure
      if ((err as Error)?.name !== 'AbortError') setShareStatus('Unable to share');
    }
  }

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
          <time dateTime={startDate.toISOString()}>{when}</time>
        </p>

        <p className="event-detail__venue">{venue}</p>
        {address && <p className="event-detail__address">{address}</p>}

        {price !== null && <p className="event-detail__price">{price}</p>}

        {sourceUrl && (
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
        )}

        <div className="event-detail__actions">
          {directions && (
            <a
              href={directions}
              className="event-detail__action"
              target="_blank"
              rel="noopener noreferrer"
            >
              Directions
            </a>
          )}
          <button type="button" className="event-detail__action" onClick={() => downloadIcs(event)}>
            Add to calendar
          </button>
          <button type="button" className="event-detail__action" onClick={() => void handleShare()}>
            Share
          </button>
          {shareStatus && (
            <span className="event-detail__action-status" role="status">
              {shareStatus}
            </span>
          )}
        </div>

        {description && <p className="event-detail__description">{description}</p>}
      </div>
    </article>
  );
}
