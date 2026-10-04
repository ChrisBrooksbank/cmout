/**
 * Daily digest scheduler for push notifications.
 *
 * Aggregates new events matching each subscriber's category preferences and
 * builds a batched notification payload. Actual delivery is handled by an
 * injected send function so that the core logic remains testable without a
 * real Web Push endpoint.
 */

import type { CmEvent, EventCategory } from '../types.js';
import {
  getSubscriptions,
  removeSubscription,
  updateLastDigestSentAt,
  type StoredSubscription,
} from './subscription-store.js';

export interface DigestEvent {
  id: string;
  title: string;
  startDate: string; // ISO 8601
  category: EventCategory;
  url: string;
}

export interface DigestPayload {
  title: string;
  body: string;
  eventCount: number;
  events: DigestEvent[];
}

interface DigestResult {
  endpoint: string;
  sent: boolean;
  eventCount: number;
  error?: string;
}

/** Injectable send function — receives the subscription and the digest payload. */
export type SendFn = (subscription: StoredSubscription, payload: DigestPayload) => Promise<void>;

function isExpiredSubscriptionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

/** How far ahead the daily digest looks for upcoming events. */
const DIGEST_WINDOW_DAYS = 7;

/**
 * Select events from `events` that match the subscriber's category preferences,
 * haven't already been sent to them, and (optionally) start within
 * [`sinceDate`, `untilDate`).
 */
export function selectEventsForSubscriber(
  events: CmEvent[],
  subscription: StoredSubscription,
  sinceDate?: Date,
  untilDate?: Date
): CmEvent[] {
  const alreadySent = new Set(subscription.sentEventIds ?? []);
  return events.filter(event => {
    if (subscription.categories.length > 0 && !subscription.categories.includes(event.category)) {
      return false;
    }
    if (alreadySent.has(event.id)) return false;
    if (sinceDate !== undefined && event.startDate < sinceDate) return false;
    if (untilDate !== undefined && event.startDate >= untilDate) return false;
    return true;
  });
}

/**
 * Build a digest notification payload from the provided events.
 * Returns `null` when there are no matching events (nothing to send).
 */
export function buildDigest(
  events: CmEvent[],
  subscription: StoredSubscription,
  sinceDate?: Date,
  untilDate?: Date
): DigestPayload | null {
  const matching = selectEventsForSubscriber(events, subscription, sinceDate, untilDate);
  if (matching.length === 0) return null;

  const digestEvents: DigestEvent[] = matching.map(e => ({
    id: e.id,
    title: e.title,
    startDate: e.startDate.toISOString(),
    category: e.category,
    url: e.sourceUrl,
  }));

  const count = matching.length;
  const title = `${count} new event${count === 1 ? '' : 's'} in Chelmsford`;

  // Build body from first three event titles
  const preview = matching
    .slice(0, 3)
    .map(e => e.title)
    .join(', ');
  const body = count > 3 ? `${preview} and ${count - 3} more` : preview;

  return { title, body, eventCount: count, events: digestEvents };
}

/**
 * Run the daily digest for all subscriptions with `frequency: 'daily-digest'`.
 *
 * Each digest covers events starting in the next week that the subscriber
 * hasn't been sent before; sent event IDs are remembered per subscription.
 *
 * @param events  Full list of events to filter against.
 * @param sinceDate  Optional lower bound for event.startDate (defaults to now).
 * @param sendFn  Function that delivers the notification — defaults to a no-op stub.
 */
export async function runDailyDigest(
  events: CmEvent[],
  sinceDate?: Date,
  sendFn: SendFn = noopSend
): Promise<DigestResult[]> {
  const since = sinceDate ?? new Date();
  const until = new Date(since);
  until.setDate(until.getDate() + DIGEST_WINDOW_DAYS);
  const currentIds = new Set(events.map(e => e.id));

  const dailySubscriptions = (await getSubscriptions()).filter(s => s.frequency === 'daily-digest');

  const promises = dailySubscriptions.map(async (sub): Promise<DigestResult> => {
    const payload = buildDigest(events, sub, since, until);

    if (payload === null) {
      return { endpoint: sub.subscription.endpoint, sent: false, eventCount: 0 };
    }

    try {
      await sendFn(sub, payload);
      // Forget IDs of events no longer listed so the stored set stays bounded
      const sentEventIds = [
        ...(sub.sentEventIds ?? []).filter(id => currentIds.has(id)),
        ...payload.events.map(e => e.id),
      ];
      await updateLastDigestSentAt(sub.subscription.endpoint, new Date(), sentEventIds);
      return {
        endpoint: sub.subscription.endpoint,
        sent: true,
        eventCount: payload.eventCount,
      };
    } catch (err) {
      if (isExpiredSubscriptionError(err)) {
        await removeSubscription(sub.subscription.endpoint);
      }
      return {
        endpoint: sub.subscription.endpoint,
        sent: false,
        eventCount: payload.eventCount,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  return Promise.all(promises);
}

/** Default no-op send function used when no sender is configured. */
async function noopSend(_subscription: StoredSubscription, _payload: DigestPayload): Promise<void> {
  // No-op: wire up a real Web Push sender (e.g. web-push npm package) here.
}
