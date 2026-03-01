import { useEffect, useState } from 'react';

const DEBOUNCE_MS = 300;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  return (
    <div className="search-bar">
      <label htmlFor="search-input" className="search-bar__label">
        Search events
      </label>
      <input
        id="search-input"
        type="search"
        className="search-bar__input"
        placeholder="Search events…"
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
      />
    </div>
  );
}
