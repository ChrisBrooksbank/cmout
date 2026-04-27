import { useEffect, useState } from 'react';

import type { EventCategory } from '../types';
import {
  getExistingPushSubscription,
  notificationSupportAvailable,
  savePushPreferences,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type NotificationPrefs,
} from '../push/browser-subscription';

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
  frequency: 'daily-digest',
};

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NotificationPrefs>;
      return {
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        frequency: 'daily-digest',
      };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_PREFS;
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
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
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadNotificationPrefs);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!('Notification' in window) || !window.Notification) return;
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (permission !== 'granted' || !notificationSupportAvailable()) return;
    let cancelled = false;
    getExistingPushSubscription().then(existing => {
      if (!cancelled && existing) setSubscription(existing);
    });
    return () => {
      cancelled = true;
    };
  }, [permission]);

  async function persistPrefs(updated: NotificationPrefs) {
    setPrefs(updated);
    saveNotificationPrefs(updated);
    if (subscription) {
      try {
        await savePushPreferences(subscription, updated);
        setStatus('Saved');
      } catch {
        setStatus('Saved locally');
      }
    }
  }

  function toggleCategory(category: EventCategory) {
    const updated: NotificationPrefs = {
      ...prefs,
      categories: prefs.categories.includes(category)
        ? prefs.categories.filter(c => c !== category)
        : [...prefs.categories, category],
    };
    void persistPrefs(updated);
  }

  async function handleEnable() {
    try {
      const nextPermission =
        Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') return;
      const nextSubscription = await subscribeToPushNotifications(prefs);
      setSubscription(nextSubscription);
      setStatus('Enabled');
    } catch {
      setStatus('Unable to enable notifications');
    }
  }

  async function handleDisable() {
    try {
      await unsubscribeFromPushNotifications();
      setSubscription(null);
      setStatus('Disabled');
    } catch {
      setStatus('Unable to disable notifications');
    }
  }

  if (!notificationSupportAvailable()) return null;
  if (permission === 'denied') {
    return (
      <section className="notification-prefs" aria-label="Notification preferences">
        <h2 className="notification-prefs__heading">Notification Preferences</h2>
        <p className="notification-prefs__status">
          Notifications are blocked in this browser. Update browser settings to enable them.
        </p>
      </section>
    );
  }

  return (
    <section className="notification-prefs" aria-label="Notification preferences">
      <h2 className="notification-prefs__heading">Notification Preferences</h2>
      <div className="notification-prefs__actions">
        {permission === 'granted' && subscription ? (
          <button type="button" className="notification-prefs__button" onClick={handleDisable}>
            Disable notifications
          </button>
        ) : (
          <button
            type="button"
            className="notification-prefs__button"
            onClick={() => void handleEnable()}
          >
            Enable notifications
          </button>
        )}
        {status && <span className="notification-prefs__status">{status}</span>}
      </div>

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
            value="daily-digest"
            checked
            readOnly
          />
          Daily digest
        </label>
      </fieldset>
    </section>
  );
}
