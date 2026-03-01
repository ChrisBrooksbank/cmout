/**
 * In-memory subscription store for push notifications.
 *
 * NOTE: This is a prototype implementation. The Map is module-level, meaning
 * it persists within a single process but is ephemeral across serverless
 * invocations. In production, replace with a persistent store such as
 * Netlify Blobs, Redis, or a database.
 *
 * Subscriptions are keyed by endpoint URL (unique per browser+device).
 */

export interface PushSubscriptionKeys {
  auth: string;
  p256dh: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface SubscriptionPreferences {
  categories: string[];
  frequency: 'immediate' | 'daily-digest';
}

export interface StoredSubscription {
  subscription: PushSubscriptionData;
  categories: string[];
  frequency: 'immediate' | 'daily-digest';
  createdAt: string;
}

const store = new Map<string, StoredSubscription>();

export function addSubscription(
  subscription: PushSubscriptionData,
  preferences: SubscriptionPreferences
): StoredSubscription {
  const entry: StoredSubscription = {
    subscription,
    categories: preferences.categories,
    frequency: preferences.frequency,
    createdAt: new Date().toISOString(),
  };
  store.set(subscription.endpoint, entry);
  return entry;
}

export function removeSubscription(endpoint: string): boolean {
  return store.delete(endpoint);
}

export function getSubscriptions(): StoredSubscription[] {
  return Array.from(store.values());
}

export function getSubscriptionCount(): number {
  return store.size;
}

/** Clear all subscriptions — intended for testing only. */
export function clearSubscriptions(): void {
  store.clear();
}
