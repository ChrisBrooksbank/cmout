import { useEffect, useRef } from 'react';

export type DateRange =
  | 'today'
  | 'tomorrow'
  | 'this-weekend'
  | 'this-week'
  | 'this-month'
  | 'custom'
  | 'all';

// "All" (the default) first, so it's visible without scrolling the chip row on phones
const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'All',
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-weekend': 'Weekend',
  'this-week': 'This week',
  'this-month': 'This month',
  custom: 'Pick date',
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
  const chipsRef = useRef<HTMLDivElement>(null);

  // Keep the selected chip visible when the row scrolls sideways (phones)
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>(
      '.date-range-filter__radio:checked'
    )?.parentElement;
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const left = chip.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: Math.max(0, left - 16), behavior: 'smooth' });
    }
  }, [selected]);

  return (
    <fieldset className="date-range-filter">
      <legend className="date-range-filter__legend">Filter by date</legend>
      <div className="date-range-filter__chips" ref={chipsRef}>
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
      </div>
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
