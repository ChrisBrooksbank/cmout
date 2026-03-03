import { useMemo, useState } from 'react';

interface ListFilterProps {
  legend: string;
  items: { name: string; count: number }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function ListFilter({ legend, items, selected, onChange }: ListFilterProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(q));
  }, [items, search]);

  if (items.length === 0) return null;

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter(s => s !== name) : [...selected, name]);
  };

  return (
    <fieldset className="list-filter">
      <legend className="list-filter__legend">{legend}</legend>
      <input
        type="search"
        className="list-filter__search"
        placeholder={`Search ${legend.toLowerCase()}…`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        aria-label={`Search ${legend.toLowerCase()}`}
      />
      {selected.length > 0 && (
        <button type="button" className="list-filter__clear" onClick={() => onChange([])}>
          Clear
        </button>
      )}
      <div className="list-filter__list" role="group" aria-label={legend}>
        {filtered.map(item => (
          <label key={item.name} className="list-filter__label">
            <input
              type="checkbox"
              className="list-filter__checkbox"
              checked={selected.includes(item.name)}
              onChange={() => toggle(item.name)}
            />
            <span className="list-filter__name">{item.name}</span>
            <span className="list-filter__count">({item.count})</span>
          </label>
        ))}
        {filtered.length === 0 && <p className="list-filter__empty">No matches</p>}
      </div>
    </fieldset>
  );
}
