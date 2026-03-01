import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CategoryFilter from './CategoryFilter';
import type { EventCategory } from '../types';

describe('CategoryFilter', () => {
  it('renders all 11 category checkboxes', () => {
    render(<CategoryFilter selected={[]} onChange={() => {}} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(11);
  });

  it('renders a fieldset with legend', () => {
    render(<CategoryFilter selected={[]} onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /filter by category/i })).toBeInTheDocument();
  });

  it('shows all category labels', () => {
    render(<CategoryFilter selected={[]} onChange={() => {}} />);
    expect(screen.getByText('Live Music')).toBeInTheDocument();
    expect(screen.getByText('Theatre & Comedy')).toBeInTheDocument();
    expect(screen.getByText('Festival')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Faith')).toBeInTheDocument();
    expect(screen.getByText('Sport')).toBeInTheDocument();
    expect(screen.getByText('Kids')).toBeInTheDocument();
    expect(screen.getByText('Pub & Bar')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('checks boxes that match selected prop', () => {
    const selected: EventCategory[] = ['live-music', 'sport'];
    render(<CategoryFilter selected={selected} onChange={() => {}} />);
    expect(screen.getByLabelText('Live Music')).toBeChecked();
    expect(screen.getByLabelText('Sport')).toBeChecked();
    expect(screen.getByLabelText('Festival')).not.toBeChecked();
  });

  it('calls onChange with added category when unchecked box is clicked', () => {
    const onChange = vi.fn();
    render(<CategoryFilter selected={['sport']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Live Music'));
    expect(onChange).toHaveBeenCalledWith(['sport', 'live-music']);
  });

  it('calls onChange with category removed when checked box is clicked', () => {
    const onChange = vi.fn();
    render(<CategoryFilter selected={['sport', 'live-music']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Sport'));
    expect(onChange).toHaveBeenCalledWith(['live-music']);
  });

  it('starts with no boxes checked when selected is empty', () => {
    render(<CategoryFilter selected={[]} onChange={() => {}} />);
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => expect(cb).not.toBeChecked());
  });
});
