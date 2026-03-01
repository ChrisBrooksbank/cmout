import { useEffect, useState } from 'react';

import type { EventCategory } from '../types';

export type NotificationFrequency = 'immediate' | 'daily-digest';

export interface NotificationPrefs {
  categories: EventCategory[];
  frequency: NotificationFrequency;
}

const STORAGE_KEY = 'cmout-notification-prefs';

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

const DEFAULT_PREFS: NotificationPrefs = {
  categories: [],
  frequency: 'immediate',
};

function loadPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as NotificationPrefs;
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: NotificationPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export default function NotificationPreferences() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (!('Notification' in window) || !window.Notification) return 'denied';
    return Notification.permission;
  });
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs);

  useEffect(() => {
    if (!('Notification' in window) || !window.Notification) return;
    setPermission(Notification.permission);
  }, []);

  function toggleCategory(category: EventCategory) {
    const updated: NotificationPrefs = {
      ...prefs,
      categories: prefs.categories.includes(category)
        ? prefs.categories.filter(c => c !== category)
        : [...prefs.categories, category],
    };
    setPrefs(updated);
    savePrefs(updated);
  }

  function handleFrequencyChange(frequency: NotificationFrequency) {
    const updated: NotificationPrefs = { ...prefs, frequency };
    setPrefs(updated);
    savePrefs(updated);
  }

  if (!('Notification' in window) || !window.Notification) return null;
  if (permission !== 'granted') return null;

  return (
    <section className="notification-prefs" aria-label="Notification preferences">
      <h2 className="notification-prefs__heading">Notification Preferences</h2>

      <fieldset className="notification-prefs__categories">
        <legend className="notification-prefs__legend">Notify me about</legend>
        {ALL_CATEGORIES.map(category => (
          <label key={category} className="notification-prefs__label">
            <input
              type="checkbox"
              className="notification-prefs__checkbox"
              checked={prefs.categories.includes(category)}
              onChange={() => toggleCategory(category)}
            />
            {CATEGORY_LABELS[category]}
          </label>
        ))}
      </fieldset>

      <fieldset className="notification-prefs__frequency">
        <legend className="notification-prefs__legend">Frequency</legend>
        <label className="notification-prefs__label">
          <input
            type="radio"
            name="notification-frequency"
            className="notification-prefs__radio"
            value="immediate"
            checked={prefs.frequency === 'immediate'}
            onChange={() => handleFrequencyChange('immediate')}
          />
          Immediate
        </label>
        <label className="notification-prefs__label">
          <input
            type="radio"
            name="notification-frequency"
            className="notification-prefs__radio"
            value="daily-digest"
            checked={prefs.frequency === 'daily-digest'}
            onChange={() => handleFrequencyChange('daily-digest')}
          />
          Daily digest
        </label>
      </fieldset>
    </section>
  );
}
