import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DateRangeFilter from './DateRangeFilter';
import type { DateRange } from './DateRangeFilter';

describe('DateRangeFilter', () => {
  it('renders 4 radio buttons', () => {
    render(<DateRangeFilter selected="all" onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  it('renders a fieldset with legend', () => {
    render(<DateRangeFilter selected="all" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /filter by date/i })).toBeInTheDocument();
  });

  it('shows all date range labels', () => {
    render(<DateRangeFilter selected="all" onChange={() => {}} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('checks the radio matching the selected prop', () => {
    render(<DateRangeFilter selected="this-week" onChange={() => {}} />);
    expect(screen.getByLabelText('This week')).toBeChecked();
    expect(screen.getByLabelText('Today')).not.toBeChecked();
    expect(screen.getByLabelText('This month')).not.toBeChecked();
    expect(screen.getByLabelText('All')).not.toBeChecked();
  });

  it('calls onChange with the selected range when a radio is clicked', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter selected="all" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Today'));
    expect(onChange).toHaveBeenCalledWith('today');
  });

  it('calls onChange with this-week when that radio is clicked', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter selected="all" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('This week'));
    expect(onChange).toHaveBeenCalledWith('this-week');
  });

  it('calls onChange with this-month when that radio is clicked', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter selected="all" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('This month'));
    expect(onChange).toHaveBeenCalledWith('this-month');
  });

  it('defaults all radio checked when selected is all', () => {
    render(<DateRangeFilter selected="all" onChange={() => {}} />);
    expect(screen.getByLabelText('All')).toBeChecked();
  });

  it('only one radio is checked at a time', () => {
    render(<DateRangeFilter selected={'today' as DateRange} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    const checked = radios.filter(r => (r as HTMLInputElement).checked);
    expect(checked).toHaveLength(1);
  });
});
