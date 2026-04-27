import { getStore } from '@netlify/blobs';

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
  updatedAt: string;
  lastDigestSentAt: string | null;
}

const store = new Map<string, StoredSubscription>();
const BLOB_STORE_NAME = 'push-subscriptions';

function hasNetlifyBlobsContext(): boolean {
  return Boolean(process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext);
}

function blobKey(endpoint: string): string {
  return Buffer.from(endpoint).toString('base64url');
}

function getBlobStore() {
  return getStore(BLOB_STORE_NAME);
}

async function readBlobSubscriptions(): Promise<StoredSubscription[]> {
  const blobs = getBlobStore();
  const result = await blobs.list();
  const subscriptions = await Promise.all(
    result.blobs.map(async blob => blobs.get(blob.key, { type: 'json' }) as Promise<unknown>)
  );

  return subscriptions.filter(isStoredSubscription);
}

function isStoredSubscription(value: unknown): value is StoredSubscription {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StoredSubscription>;
  return (
    typeof candidate.subscription?.endpoint === 'string' &&
    typeof candidate.subscription?.keys?.auth === 'string' &&
    typeof candidate.subscription?.keys?.p256dh === 'string' &&
    Array.isArray(candidate.categories) &&
    (candidate.frequency === 'immediate' || candidate.frequency === 'daily-digest') &&
    typeof candidate.createdAt === 'string'
  );
}

export async function addSubscription(
  subscription: PushSubscriptionData,
  preferences: SubscriptionPreferences
): Promise<StoredSubscription> {
  const existing = hasNetlifyBlobsContext()
    ? ((await getBlobStore().get(blobKey(subscription.endpoint), {
        type: 'json',
      })) as StoredSubscription | null)
    : store.get(subscription.endpoint);
  const now = new Date().toISOString();
  const entry: StoredSubscription = {
    subscription,
    categories: preferences.categories,
    frequency: preferences.frequency,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastDigestSentAt: existing?.lastDigestSentAt ?? null,
  };
  if (hasNetlifyBlobsContext()) {
    await getBlobStore().setJSON(blobKey(subscription.endpoint), entry);
  } else {
    store.set(subscription.endpoint, entry);
  }
  return entry;
}

export async function removeSubscription(endpoint: string): Promise<boolean> {
  if (hasNetlifyBlobsContext()) {
    const key = blobKey(endpoint);
    const existing = await getBlobStore().get(key);
    if (existing === null) return false;
    await getBlobStore().delete(key);
    return true;
  }
  return store.delete(endpoint);
}

export async function getSubscriptions(): Promise<StoredSubscription[]> {
  if (hasNetlifyBlobsContext()) return readBlobSubscriptions();
  return Array.from(store.values());
}

export async function getSubscriptionCount(): Promise<number> {
  if (hasNetlifyBlobsContext()) {
    const result = await getBlobStore().list();
    return result.blobs.length;
  }
  return store.size;
}

export async function updateLastDigestSentAt(endpoint: string, sentAt: Date): Promise<void> {
  const subscriptions = await getSubscriptions();
  const existing = subscriptions.find(s => s.subscription.endpoint === endpoint);
  if (!existing) return;

  const updated: StoredSubscription = {
    ...existing,
    updatedAt: new Date().toISOString(),
    lastDigestSentAt: sentAt.toISOString(),
  };

  if (hasNetlifyBlobsContext()) {
    await getBlobStore().setJSON(blobKey(endpoint), updated);
  } else {
    store.set(endpoint, updated);
  }
}

/** Clear all subscriptions - intended for testing only. */
export async function clearSubscriptions(): Promise<void> {
  if (hasNetlifyBlobsContext()) {
    await getBlobStore().deleteAll();
  }
  store.clear();
}
