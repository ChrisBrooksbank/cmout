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
  beforeEach(() => {
    clearSubscriptions();
  });

  describe('addSubscription', () => {
    it('stores a new subscription', () => {
      addSubscription(makeSub(), defaultPrefs);
      expect(getSubscriptionCount()).toBe(1);
    });

    it('returns the stored entry', () => {
      const entry = addSubscription(makeSub(), defaultPrefs);
      expect(entry.subscription.endpoint).toBe('https://push.example.com/endpoint-1');
      expect(entry.categories).toEqual(['live-music', 'community']);
      expect(entry.frequency).toBe('immediate');
    });

    it('stores createdAt as an ISO date string', () => {
      const entry = addSubscription(makeSub(), defaultPrefs);
      expect(() => new Date(entry.createdAt)).not.toThrow();
      expect(new Date(entry.createdAt).toISOString()).toBe(entry.createdAt);
    });

    it('upserts when the same endpoint is added twice', () => {
      addSubscription(makeSub(), defaultPrefs);
      addSubscription(makeSub(), { categories: ['sport'], frequency: 'daily-digest' });
      expect(getSubscriptionCount()).toBe(1);
      const [stored] = getSubscriptions();
      expect(stored.categories).toEqual(['sport']);
      expect(stored.frequency).toBe('daily-digest');
    });

    it('stores multiple subscriptions with different endpoints', () => {
      addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      expect(getSubscriptionCount()).toBe(2);
    });
  });

  describe('removeSubscription', () => {
    it('removes an existing subscription and returns true', () => {
      const sub = makeSub();
      addSubscription(sub, defaultPrefs);
      const result = removeSubscription(sub.endpoint);
      expect(result).toBe(true);
      expect(getSubscriptionCount()).toBe(0);
    });

    it('returns false when endpoint does not exist', () => {
      const result = removeSubscription('https://push.example.com/nonexistent');
      expect(result).toBe(false);
    });

    it('only removes the matching endpoint', () => {
      addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      removeSubscription('https://push.example.com/ep-1');
      expect(getSubscriptionCount()).toBe(1);
      const [remaining] = getSubscriptions();
      expect(remaining.subscription.endpoint).toBe('https://push.example.com/ep-2');
    });
  });

  describe('getSubscriptions', () => {
    it('returns an empty array when no subscriptions exist', () => {
      expect(getSubscriptions()).toEqual([]);
    });

    it('returns all stored subscriptions', () => {
      addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      const subs = getSubscriptions();
      expect(subs).toHaveLength(2);
    });

    it('returned subscriptions include full subscription data', () => {
      const sub = makeSub();
      addSubscription(sub, defaultPrefs);
      const [stored] = getSubscriptions();
      expect(stored.subscription.keys.auth).toBe('auth-key-abc');
      expect(stored.subscription.keys.p256dh).toBe('p256dh-key-xyz');
    });
  });

  describe('getSubscriptionCount', () => {
    it('returns 0 for empty store', () => {
      expect(getSubscriptionCount()).toBe(0);
    });

    it('increments when subscriptions are added', () => {
      addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      expect(getSubscriptionCount()).toBe(1);
      addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      expect(getSubscriptionCount()).toBe(2);
    });

    it('decrements when a subscription is removed', () => {
      const sub = makeSub();
      addSubscription(sub, defaultPrefs);
      removeSubscription(sub.endpoint);
      expect(getSubscriptionCount()).toBe(0);
    });
  });

  describe('clearSubscriptions', () => {
    it('removes all subscriptions', () => {
      addSubscription(makeSub('https://push.example.com/ep-1'), defaultPrefs);
      addSubscription(makeSub('https://push.example.com/ep-2'), defaultPrefs);
      clearSubscriptions();
      expect(getSubscriptionCount()).toBe(0);
    });
  });
});
