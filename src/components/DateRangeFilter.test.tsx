import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DateRangeFilter from './DateRangeFilter';
import type { DateRange } from './DateRangeFilter';

const defaultProps = {
  selected: 'all' as DateRange,
  onChange: () => {},
  customDate: '',
  onCustomDateChange: () => {},
};

describe('DateRangeFilter', () => {
  it('renders 7 radio buttons', () => {
    render(<DateRangeFilter {...defaultProps} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(7);
  });

  it('renders a fieldset with legend', () => {
    render(<DateRangeFilter {...defaultProps} />);
    expect(screen.getByRole('group', { name: /filter by date/i })).toBeInTheDocument();
  });

  it('shows all date range labels', () => {
    render(<DateRangeFilter {...defaultProps} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Weekend')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('Pick date')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('checks the radio matching the selected prop', () => {
    render(<DateRangeFilter {...defaultProps} selected="this-week" />);
    expect(screen.getByLabelText('This week')).toBeChecked();
    expect(screen.getByLabelText('Today')).not.toBeChecked();
  });

  it('calls onChange with the selected range when a radio is clicked', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Today'));
    expect(onChange).toHaveBeenCalledWith('today');
  });

  it('calls onChange with tomorrow when that radio is clicked', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Tomorrow'));
    expect(onChange).toHaveBeenCalledWith('tomorrow');
  });

  it('calls onChange with this-weekend when Weekend radio is clicked', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Weekend'));
    expect(onChange).toHaveBeenCalledWith('this-weekend');
  });

  it('defaults all radio checked when selected is all', () => {
    render(<DateRangeFilter {...defaultProps} />);
    expect(screen.getByLabelText('All')).toBeChecked();
  });

  it('only one radio is checked at a time', () => {
    render(<DateRangeFilter {...defaultProps} selected="today" />);
    const radios = screen.getAllByRole('radio');
    const checked = radios.filter(r => (r as HTMLInputElement).checked);
    expect(checked).toHaveLength(1);
  });

  it('shows date input when custom is selected', () => {
    render(<DateRangeFilter {...defaultProps} selected="custom" />);
    expect(screen.getByLabelText('Pick a date')).toBeInTheDocument();
  });

  it('hides date input when custom is not selected', () => {
    render(<DateRangeFilter {...defaultProps} selected="all" />);
    expect(screen.queryByLabelText('Pick a date')).not.toBeInTheDocument();
  });

  it('calls onCustomDateChange when date input changes', () => {
    const onCustomDateChange = vi.fn();
    render(
      <DateRangeFilter
        {...defaultProps}
        selected="custom"
        onCustomDateChange={onCustomDateChange}
      />
    );
    fireEvent.change(screen.getByLabelText('Pick a date'), { target: { value: '2026-06-15' } });
    expect(onCustomDateChange).toHaveBeenCalledWith('2026-06-15');
  });
});
