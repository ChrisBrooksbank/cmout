import { useEffect, useState } from 'react';

import {
  subscribeToPushNotifications,
  notificationSupportAvailable,
} from '../push/browser-subscription';
import { loadNotificationPrefs } from './NotificationPreferences';

type PermissionState = 'default' | 'granted' | 'denied';

const ENGAGEMENT_KEY = 'cmout-push-prompt';
/** Only ask once someone has come back on this many different days. */
export const MIN_VISIT_DAYS = 3;
const SNOOZE_DAYS = 30;

interface Engagement {
  visitDays: number;
  lastVisit: string | null;
  snoozedUntil: string | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readEngagement(): Engagement {
  try {
    const parsed = JSON.parse(localStorage.getItem(ENGAGEMENT_KEY) ?? '{}') as Partial<Engagement>;
    return {
      visitDays: typeof parsed.visitDays === 'number' ? parsed.visitDays : 0,
      lastVisit: typeof parsed.lastVisit === 'string' ? parsed.lastVisit : null,
      snoozedUntil: typeof parsed.snoozedUntil === 'string' ? parsed.snoozedUntil : null,
    };
  } catch {
    return { visitDays: 0, lastVisit: null, snoozedUntil: null };
  }
}

function writeEngagement(engagement: Engagement) {
  try {
    localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(engagement));
  } catch {
    /* ignore */
  }
}

/** Count this visit (once per day) and say whether we may ask for permission yet. */
function recordVisitAndCheck(): boolean {
  const engagement = readEngagement();
  const today = todayKey();
  if (engagement.lastVisit !== today) {
    engagement.visitDays += 1;
    engagement.lastVisit = today;
    writeEngagement(engagement);
  }
  const snoozed =
    engagement.snoozedUntil !== null && new Date(engagement.snoozedUntil) > new Date();
  return engagement.visitDays >= MIN_VISIT_DAYS && !snoozed;
}

function snoozePrompt() {
  const until = new Date();
  until.setDate(until.getDate() + SNOOZE_DAYS);
  writeEngagement({ ...readEngagement(), snoozedUntil: until.toISOString() });
}

function getNotificationPermission(): PermissionState {
  if (!notificationSupportAvailable()) return 'denied';
  return Notification.permission as PermissionState;
}

export default function PushNotificationPrompt() {
  const [permission, setPermission] = useState<PermissionState>(getNotificationPermission);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Don't ask on someone's first visits — wait until they've come back a few times
  const [eligible] = useState(recordVisitAndCheck);

  useEffect(() => {
    if (!notificationSupportAvailable()) return;

    const handleInteraction = () => setHasInteracted(true);

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    window.addEventListener('scroll', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
    };
  }, []);

  async function handleEnableClick() {
    if (!notificationSupportAvailable()) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result === 'granted') {
        await subscribeToPushNotifications(loadNotificationPrefs());
      }
    } catch {
      // Subscription failed (e.g. push not configured) — hide the prompt rather than
      // leaving an unhandled rejection; the user can retry from Settings
      setDismissed(true);
    }
  }

  function handleDismiss() {
    snoozePrompt();
    setDismissed(true);
  }

  if (!notificationSupportAvailable()) return null;
  if (!eligible) return null;
  if (!hasInteracted) return null;
  if (permission !== 'default') return null;
  if (dismissed) return null;

  return (
    <div className="push-prompt" role="complementary" aria-label="Enable notifications">
      <p className="push-prompt__text">
        Get notified about new Chelmsford events matching your interests
      </p>
      <div className="push-prompt__actions">
        <button className="push-prompt__button" onClick={() => void handleEnableClick()}>
          Enable notifications
        </button>
        <button className="push-prompt__dismiss" onClick={handleDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
