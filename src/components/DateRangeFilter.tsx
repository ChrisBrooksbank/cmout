export type DateRange =
  | 'today'
  | 'tomorrow'
  | 'this-weekend'
  | 'this-week'
  | 'this-month'
  | 'custom'
  | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-weekend': 'Weekend',
  'this-week': 'This week',
  'this-month': 'This month',
  custom: 'Pick date',
  all: 'All',
};

const ALL_RANGES = Object.keys(DATE_RANGE_LABELS) as DateRange[];

interface DateRangeFilterProps {
  selected: DateRange;
  onChange: (selected: DateRange) => void;
  customDate: string;
  onCustomDateChange: (date: string) => void;
}

export default function DateRangeFilter({
  selected,
  onChange,
  customDate,
  onCustomDateChange,
}: DateRangeFilterProps) {
  return (
    <fieldset className="date-range-filter">
      <legend className="date-range-filter__legend">Filter by date</legend>
      {ALL_RANGES.map(range => (
        <label key={range} className="date-range-filter__label">
          <input
            type="radio"
            className="date-range-filter__radio"
            name="date-range"
            value={range}
            checked={selected === range}
            onChange={() => onChange(range)}
          />
          {DATE_RANGE_LABELS[range]}
        </label>
      ))}
      {selected === 'custom' && (
        <input
          type="date"
          className="date-range-filter__date-input"
          value={customDate}
          onChange={e => onCustomDateChange(e.target.value)}
          aria-label="Pick a date"
        />
      )}
    </fieldset>
  );
}
