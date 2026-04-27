import { describe, it, expect, beforeEach } from 'vitest';
import {
  addSubscription,
  removeSubscription,
  getSubscriptions,
  getSubscriptionCount,
  clearSubscriptions,
  type PushSubscriptionData,
  type SubscriptionPreferences,
} from './subscription-store.js';

function makeSub(endpoint = 'https://push.example.com/endpoint-1'): PushSubscriptionData {
  return {
    endpoint,
    keys: { auth: 'auth-key-abc', p256dh: 'p256dh-key-xyz' },
  };
}

const defaultPrefs: SubscriptionPreferences = {
  categories: ['live-music', 'community'],
  frequency: 'immediate',
};

describe('subscription-store', () => {
  beforeEach(async () => {
    await clearSubscriptions();
  });

  describe('addSubscription', () => {
    it('stores a new subscription', async () => {
      await addSubscription(makeSub(), defaultPrefs);
      await expect(getSubscriptionCount()).resolves.toBe(1);
    });

    it('returns the stored entry', async () => {
      const entry = await addSubscription(makeSub(), defaultPrefs);
      expect(entry.subscription.endpoint).toBe('https://push.example.com/endpoint-1');
      expect(entry.categories).toEqual(['live-music', 'community']);
      expect(entry.frequency).toBe('immediate');
    });

    it('stores createdAt as an ISO date string', async () => {
      const entry = await addSubscription(makeSub(), defaultPrefs);
      expect(() => new Date(entry.createdAt)).not.toThrow();
      expect(new Date(entry.createdAt).toISOString()).toBe(entry.createdAt);
    });

    it('upserts when the same endpoint is added twice', async () => {
      await addSubscription(makeSub(), defaultPrefs);
      await addSubscription(makeSub(), { categories: ['sport'], frequency: 'daily-digest' });
      await expect(getSubscriptionCount()).resolves.toBe(1);
      const [stored] = await getSubscriptions();
      expect(stored.categories).toEqual(['sport']);
      expect(stored.frequency).toBe('daily-digest');
    });

    it('stores multiple subscriptions with different endpoints', async () => {
      await addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      await addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      await expect(getSubscriptionCount()).resolves.toBe(2);
    });
  });

  describe('removeSubscription', () => {
    it('removes an existing subscription and returns true', async () => {
      const sub = makeSub();
      await addSubscription(sub, defaultPrefs);
      const result = await removeSubscription(sub.endpoint);
      expect(result).toBe(true);
      await expect(getSubscriptionCount()).resolves.toBe(0);
    });

    it('returns false when endpoint does not exist', async () => {
      const result = await removeSubscription('https://push.example.com/nonexistent');
      expect(result).toBe(false);
    });

    it('only removes the matching endpoint', async () => {
      await addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      await addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      await removeSubscription('https://push.example.com/ep-1');
      await expect(getSubscriptionCount()).resolves.toBe(1);
      const [remaining] = await getSubscriptions();
      expect(remaining.subscription.endpoint).toBe('https://push.example.com/ep-2');
    });
  });

  describe('getSubscriptions', () => {
    it('returns an empty array when no subscriptions exist', async () => {
      await expect(getSubscriptions()).resolves.toEqual([]);
    });

    it('returns all stored subscriptions', async () => {
      await addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      await addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      const subs = await getSubscriptions();
      expect(subs).toHaveLength(2);
    });

    it('returned subscriptions include full subscription data', async () => {
      const sub = makeSub();
      await addSubscription(sub, defaultPrefs);
      const [stored] = await getSubscriptions();
      expect(stored.subscription.keys.auth).toBe('auth-key-abc');
      expect(stored.subscription.keys.p256dh).toBe('p256dh-key-xyz');
    });
  });

  describe('getSubscriptionCount', () => {
    it('returns 0 for empty store', async () => {
      await expect(getSubscriptionCount()).resolves.toBe(0);
    });

    it('increments when subscriptions are added', async () => {
      await addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      await expect(getSubscriptionCount()).resolves.toBe(1);
      await addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      await expect(getSubscriptionCount()).resolves.toBe(2);
    });

    it('decrements when a subscription is removed', async () => {
      const sub = makeSub();
      await addSubscription(sub, defaultPrefs);
      await removeSubscription(sub.endpoint);
      await expect(getSubscriptionCount()).resolves.toBe(0);
    });
  });

  describe('clearSubscriptions', () => {
    it('removes all subscriptions', async () => {
      await addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      await addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      await clearSubscriptions();
      await expect(getSubscriptionCount()).resolves.toBe(0);
    });
  });
});
