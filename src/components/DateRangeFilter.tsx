export type DateRange = 'today' | 'this-week' | 'this-month' | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  'this-week': 'This week',
  'this-month': 'This month',
  all: 'All',
};

const ALL_RANGES = Object.keys(DATE_RANGE_LABELS) as DateRange[];

interface DateRangeFilterProps {
  selected: DateRange;
  onChange: (selected: DateRange) => void;
}

export default function DateRangeFilter({ selected, onChange }: DateRangeFilterProps) {
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
    </fieldset>
  );
}
