import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import EventDetail from './EventDetail';
import type { CmEvent } from '../types';

const baseEvent: CmEvent = {
  id: 'evt-1',
  title: 'Summer Jazz Night',
  description: 'A wonderful jazz evening in the heart of Chelmsford.',
  startDate: new Date('2026-07-15T19:30:00Z'),
  endDate: new Date('2026-07-15T22:00:00Z'),
  venue: 'The Shire Hall',
  address: 'Market Road, Chelmsford, CM1 1GG',
  category: 'live-music',
  source: 'openactive',
  sourceUrl: 'https://example.com/event/1',
  latitude: 51.736,
  longitude: 0.469,
  imageUrl: 'https://example.com/image.jpg',
  price: '£10',
  promoter: null,
};

describe('EventDetail', () => {
  it('renders the event title as a heading', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    expect(screen.getByRole('heading', { name: /summer jazz night/i })).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    expect(screen.getByText(/wonderful jazz evening/i)).toBeInTheDocument();
  });

  it('renders the venue', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    expect(screen.getByText('The Shire Hall')).toBeInTheDocument();
  });

  it('renders the address', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    expect(screen.getByText('Market Road, Chelmsford, CM1 1GG')).toBeInTheDocument();
  });

  it('renders the category badge', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    expect(screen.getByText('Live Music')).toBeInTheDocument();
  });

  it('renders the price', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    expect(screen.getByText('£10')).toBeInTheDocument();
  });

  it('does not render price when price is null', () => {
    render(<EventDetail event={{ ...baseEvent, price: null }} onBack={() => {}} />);
    expect(screen.queryByText(/£/)).not.toBeInTheDocument();
  });

  it('renders the image when imageUrl is provided', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    const img = screen.getByRole('img', { name: /summer jazz night/i });
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('does not render an image when imageUrl is null', () => {
    render(<EventDetail event={{ ...baseEvent, imageUrl: null }} onBack={() => {}} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders start date and time', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    const times = screen.getAllByRole('time');
    expect(times[0]).toHaveAttribute('datetime', '2026-07-15T19:30:00.000Z');
  });

  it('renders end time when endDate is provided', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    const times = screen.getAllByRole('time');
    expect(times).toHaveLength(2);
    expect(times[1]).toHaveAttribute('datetime', '2026-07-15T22:00:00.000Z');
  });

  it('renders only one time element when endDate is null', () => {
    render(<EventDetail event={{ ...baseEvent, endDate: null }} onBack={() => {}} />);
    const times = screen.getAllByRole('time');
    expect(times).toHaveLength(1);
  });

  it('renders a source link with correct href', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    const link = screen.getByRole('link', { name: /more info/i });
    expect(link).toHaveAttribute('href', 'https://example.com/event/1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders a back button', () => {
    render(<EventDetail event={baseEvent} onBack={() => {}} />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<EventDetail event={baseEvent} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
