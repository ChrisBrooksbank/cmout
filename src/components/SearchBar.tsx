import { useEffect, useState } from 'react';

import type { SmartSearchPhase } from '../hooks/useSmartSearch';

const DEBOUNCE_MS = 300;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  smartSearchPhase?: SmartSearchPhase;
  onAcceptSmartSearch?: () => void;
  onDeclineSmartSearch?: () => void;
}

export default function SearchBar({
  value,
  onChange,
  smartSearchPhase = 'idle',
  onAcceptSmartSearch,
  onDeclineSmartSearch,
}: SearchBarProps) {
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
        placeholder="Try 'fun for kids' or 'live music'…"
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
      />
      {smartSearchPhase === 'loading' && (
        <span className="search-bar__status" aria-live="polite">
          Loading smart search…
        </span>
      )}
      {smartSearchPhase === 'ready' && localValue && (
        <span className="search-bar__status" aria-live="polite">
          Smart search active
        </span>
      )}
      {smartSearchPhase === 'prompt' && (
        <span className="search-bar__status" aria-live="polite">
          Enable smart search? (~23 MB){' '}
          <button type="button" className="search-bar__action" onClick={onAcceptSmartSearch}>
            Enable
          </button>{' '}
          <button type="button" className="search-bar__action" onClick={onDeclineSmartSearch}>
            No thanks
          </button>
        </span>
      )}
      {smartSearchPhase === 'disabled' && (
        <span className="search-bar__status" aria-live="polite">
          Smart search off{' '}
          <button type="button" className="search-bar__action" onClick={onAcceptSmartSearch}>
            Turn on
          </button>
        </span>
      )}
      {smartSearchPhase === 'error' && (
        <span className="search-bar__status" aria-live="polite">
          Smart search unavailable
        </span>
      )}
    </div>
  );
}
