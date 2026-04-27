import webpush from 'web-push';

import type { DigestPayload, SendFn } from './digest-scheduler.js';
import type { StoredSubscription } from './subscription-store.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function configureWebPush() {
  webpush.setVapidDetails(
    requireEnv('VAPID_SUBJECT'),
    requireEnv('VAPID_PUBLIC_KEY'),
    requireEnv('VAPID_PRIVATE_KEY')
  );
}

function payloadUrl(payload: DigestPayload): string {
  if (payload.events.length === 1) return payload.events[0].url;
  return '/';
}

export const sendDigestPush: SendFn = async (
  subscription: StoredSubscription,
  payload: DigestPayload
) => {
  configureWebPush();
  await webpush.sendNotification(
    subscription.subscription,
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      url: payloadUrl(payload),
      eventCount: payload.eventCount,
    })
  );
};
