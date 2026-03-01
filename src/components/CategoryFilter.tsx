import type { EventCategory } from '../types';

const CATEGORY_LABELS: Record<EventCategory, string> = {
  'live-music': 'Live Music',
  'theatre-comedy': 'Theatre & Comedy',
  festival: 'Festival',
  'fitness-class': 'Fitness',
  community: 'Community',
  library: 'Library',
  'church-faith': 'Faith',
  sport: 'Sport',
  kids: 'Kids',
  'pub-bar': 'Pub & Bar',
  other: 'Other',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as EventCategory[];

interface CategoryFilterProps {
  selected: EventCategory[];
  onChange: (selected: EventCategory[]) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  function toggle(category: EventCategory) {
    if (selected.includes(category)) {
      onChange(selected.filter(c => c !== category));
    } else {
      onChange([...selected, category]);
    }
  }

  return (
    <fieldset className="category-filter">
      <legend className="category-filter__legend">Filter by category</legend>
      {ALL_CATEGORIES.map(category => (
        <label key={category} className="category-filter__label">
          <input
            type="checkbox"
            className="category-filter__checkbox"
            checked={selected.includes(category)}
            onChange={() => toggle(category)}
          />
          {CATEGORY_LABELS[category]}
        </label>
      ))}
    </fieldset>
  );
}
