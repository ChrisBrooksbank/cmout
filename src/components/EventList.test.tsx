import { render, screen } from '@testing-library/react';
import EventList from './EventList';
import type { CmEvent } from '../types';

const makeEvent = (id: string, title: string): CmEvent => ({
  id,
  title,
  description: 'A test event',
  startDate: new Date('2026-07-15T19:30:00Z'),
  endDate: null,
  venue: 'Test Venue',
  address: 'Test Address',
  category: 'community',
  source: 'openactive',
  sourceUrl: 'https://example.com/event/' + id,
  latitude: 51.736,
  longitude: 0.469,
  imageUrl: null,
  price: null,
  promoter: null,
});

describe('EventList', () => {
  it('renders a list of events', () => {
    const events = [makeEvent('1', 'Event One'), makeEvent('2', 'Event Two')];
    render(<EventList events={events} />);
    expect(screen.getByRole('heading', { name: /event one/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /event two/i })).toBeInTheDocument();
  });

  it('renders each event as a list item', () => {
    const events = [makeEvent('1', 'Event One'), makeEvent('2', 'Event Two')];
    render(<EventList events={events} />);
    const list = screen.getByRole('list', { name: /events/i });
    expect(list.querySelectorAll('li')).toHaveLength(2);
  });

  it('shows empty state message when events array is empty', () => {
    render(<EventList events={[]} />);
    expect(screen.getByText(/no events found/i)).toBeInTheDocument();
  });

  it('does not render a list when events array is empty', () => {
    render(<EventList events={[]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders a single event correctly', () => {
    const events = [makeEvent('1', 'Solo Event')];
    render(<EventList events={events} />);
    expect(screen.getByRole('heading', { name: /solo event/i })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /events/i }).querySelectorAll('li')).toHaveLength(1);
  });
});
