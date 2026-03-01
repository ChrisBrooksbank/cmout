import { render, screen } from '@testing-library/react';
import EventCard from './EventCard';
import type { CmEvent } from '../types';

const baseEvent: CmEvent = {
  id: 'evt-1',
  title: 'Summer Jazz Night',
  description: 'A great jazz evening',
  startDate: new Date('2026-07-15T19:30:00Z'),
  endDate: new Date('2026-07-15T22:00:00Z'),
  venue: 'The Shire Hall',
  address: 'Market Road, Chelmsford',
  category: 'live-music',
  source: 'openactive',
  sourceUrl: 'https://example.com/event/1',
  latitude: 51.736,
  longitude: 0.469,
  imageUrl: 'https://example.com/image.jpg',
  price: '£10',
};

describe('EventCard', () => {
  it('renders the event title', () => {
    render(<EventCard event={baseEvent} />);
    expect(screen.getByRole('heading', { name: /summer jazz night/i })).toBeInTheDocument();
  });

  it('renders the venue', () => {
    render(<EventCard event={baseEvent} />);
    expect(screen.getByText('The Shire Hall')).toBeInTheDocument();
  });

  it('renders the category badge', () => {
    render(<EventCard event={baseEvent} />);
    expect(screen.getByText('Live Music')).toBeInTheDocument();
  });

  it('renders the price', () => {
    render(<EventCard event={baseEvent} />);
    expect(screen.getByText('£10')).toBeInTheDocument();
  });

  it('renders the image when imageUrl is provided', () => {
    render(<EventCard event={baseEvent} />);
    const img = screen.getByRole('img', { name: /summer jazz night/i });
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('does not render an image when imageUrl is null', () => {
    render(<EventCard event={{ ...baseEvent, imageUrl: null }} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not render a price when price is null', () => {
    render(<EventCard event={{ ...baseEvent, price: null }} />);
    expect(screen.queryByText(/£/)).not.toBeInTheDocument();
  });

  it('renders start date and time', () => {
    render(<EventCard event={baseEvent} />);
    // Should contain the formatted start date (locale-dependent text check via time element)
    const times = screen.getAllByRole('time');
    expect(times.length).toBeGreaterThanOrEqual(1);
    expect(times[0]).toHaveAttribute('datetime', '2026-07-15T19:30:00.000Z');
  });

  it('renders end time when endDate is provided', () => {
    render(<EventCard event={baseEvent} />);
    const times = screen.getAllByRole('time');
    expect(times).toHaveLength(2);
    expect(times[1]).toHaveAttribute('datetime', '2026-07-15T22:00:00.000Z');
  });

  it('renders only one time element when endDate is null', () => {
    render(<EventCard event={{ ...baseEvent, endDate: null }} />);
    const times = screen.getAllByRole('time');
    expect(times).toHaveLength(1);
  });

  it('renders the correct category label for each category', () => {
    const categories: Array<{ category: CmEvent['category']; label: string }> = [
      { category: 'theatre-comedy', label: 'Theatre & Comedy' },
      { category: 'festival', label: 'Festival' },
      { category: 'fitness-class', label: 'Fitness' },
      { category: 'community', label: 'Community' },
      { category: 'library', label: 'Library' },
      { category: 'church-faith', label: 'Faith' },
      { category: 'sport', label: 'Sport' },
      { category: 'kids', label: 'Kids' },
      { category: 'pub-bar', label: 'Pub & Bar' },
      { category: 'other', label: 'Other' },
    ];

    for (const { category, label } of categories) {
      const { unmount } = render(<EventCard event={{ ...baseEvent, category }} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
