import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CategoryFilter from './CategoryFilter';
import type { CmEvent, EventCategory } from '../types';

const makeEvent = (category: EventCategory): CmEvent => ({
  id: `evt-${category}`,
  title: `Test ${category}`,
  description: '',
  startDate: new Date('2026-03-03T10:00:00Z'),
  endDate: null,
  venue: 'Test Venue',
  address: '',
  category,
  source: 'openactive',
  sourceUrl: '',
  latitude: null,
  longitude: null,
  imageUrl: null,
  price: null,
});

const allEvents: CmEvent[] = [
  makeEvent('live-music'),
  makeEvent('theatre-comedy'),
  makeEvent('festival'),
  makeEvent('fitness-class'),
  makeEvent('community'),
  makeEvent('library'),
  makeEvent('church-faith'),
  makeEvent('sport'),
  makeEvent('kids'),
  makeEvent('pub-bar'),
  makeEvent('other'),
];

describe('CategoryFilter', () => {
  it('renders checkboxes only for categories with events', () => {
    const events = [makeEvent('live-music'), makeEvent('sport')];
    render(<CategoryFilter selected={[]} onChange={() => {}} events={events} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(screen.getByText('Live Music')).toBeInTheDocument();
    expect(screen.getByText('Sport')).toBeInTheDocument();
    expect(screen.queryByText('Community')).not.toBeInTheDocument();
  });

  it('renders all 11 category checkboxes when all categories have events', () => {
    render(<CategoryFilter selected={[]} onChange={() => {}} events={allEvents} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(11);
  });

  it('renders a fieldset with legend', () => {
    render(<CategoryFilter selected={[]} onChange={() => {}} events={allEvents} />);
    expect(screen.getByRole('group', { name: /filter by category/i })).toBeInTheDocument();
  });

  it('checks boxes that match selected prop', () => {
    const selected: EventCategory[] = ['live-music', 'sport'];
    render(<CategoryFilter selected={selected} onChange={() => {}} events={allEvents} />);
    expect(screen.getByLabelText('Live Music')).toBeChecked();
    expect(screen.getByLabelText('Sport')).toBeChecked();
    expect(screen.getByLabelText('Festival')).not.toBeChecked();
  });

  it('calls onChange with added category when unchecked box is clicked', () => {
    const onChange = vi.fn();
    render(<CategoryFilter selected={['sport']} onChange={onChange} events={allEvents} />);
    fireEvent.click(screen.getByLabelText('Live Music'));
    expect(onChange).toHaveBeenCalledWith(['sport', 'live-music']);
  });

  it('calls onChange with category removed when checked box is clicked', () => {
    const onChange = vi.fn();
    render(
      <CategoryFilter selected={['sport', 'live-music']} onChange={onChange} events={allEvents} />
    );
    fireEvent.click(screen.getByLabelText('Sport'));
    expect(onChange).toHaveBeenCalledWith(['live-music']);
  });

  it('starts with no boxes checked when selected is empty', () => {
    render(<CategoryFilter selected={[]} onChange={() => {}} events={allEvents} />);
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => expect(cb).not.toBeChecked());
  });

  it('renders no checkboxes when events array is empty', () => {
    render(<CategoryFilter selected={[]} onChange={() => {}} events={[]} />);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });
});
