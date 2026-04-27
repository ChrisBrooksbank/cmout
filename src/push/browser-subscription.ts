import type { EventCategory } from '../types';

export type NotificationFrequency = 'immediate' | 'daily-digest';

export interface NotificationPrefs {
  categories: EventCategory[];
  frequency: NotificationFrequency;
}

interface SubscribeInfo {
  publicKey: string | null;
}

const SUBSCRIBE_URL = '/api/subscribe';

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes.buffer;
}

function pushSubscriptionData(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: {
      auth: json.keys?.auth ?? '',
      p256dh: json.keys?.p256dh ?? '',
    },
  };
}

async function getPublicKey(): Promise<string> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (envKey) return envKey;

  const response = await fetch(SUBSCRIBE_URL);
  if (!response.ok) throw new Error('Unable to load notification configuration');
  const info = (await response.json()) as SubscribeInfo;
  if (!info.publicKey) throw new Error('Notifications are not configured');
  return info.publicKey;
}

export function notificationSupportAvailable(): boolean {
  return Boolean(
    'Notification' in window &&
    window.Notification &&
    'serviceWorker' in navigator &&
    navigator.serviceWorker &&
    'PushManager' in window &&
    window.PushManager
  );
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!notificationSupportAvailable()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPushNotifications(
  prefs: NotificationPrefs
): Promise<PushSubscription> {
  if (!notificationSupportAvailable()) throw new Error('Push notifications are not supported');

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToArrayBuffer(await getPublicKey()),
    }));

  await savePushPreferences(subscription, prefs);
  return subscription;
}

export async function savePushPreferences(
  subscription: PushSubscription,
  prefs: NotificationPrefs
): Promise<void> {
  const response = await fetch(SUBSCRIBE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: pushSubscriptionData(subscription),
      preferences: prefs,
    }),
  });

  if (!response.ok) throw new Error('Unable to save notification preferences');
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;

  await fetch(SUBSCRIBE_URL, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
