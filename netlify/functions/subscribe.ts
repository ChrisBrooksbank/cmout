/**
 * Netlify Function: /api/subscribe
 *
 * Handles push notification subscriptions.
 *
 * POST   /api/subscribe  — register or update a subscription
 * DELETE /api/subscribe  — unregister a subscription
 * GET    /api/subscribe  — return current subscription count (health check)
 *
 * Required environment variables:
 *   VAPID_PUBLIC_KEY   — base64url-encoded P-256 public key
 *   VAPID_PRIVATE_KEY  — base64url-encoded P-256 private key
 *   VAPID_SUBJECT      — mailto: or https: contact URI (e.g. mailto:admin@example.com)
 */

import {
  addSubscription,
  removeSubscription,
  getSubscriptionCount,
  type PushSubscriptionData,
  type SubscriptionPreferences,
} from '../../src/push/subscription-store.js';

interface SubscribeBody {
  subscription: PushSubscriptionData;
  preferences: SubscriptionPreferences;
}

interface UnsubscribeBody {
  endpoint: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function publicVapidKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export default async function handler(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    return jsonResponse({
      count: await getSubscriptionCount(),
      publicKey: publicVapidKey(),
    });
  }

  if (method === 'POST') {
    let body: SubscribeBody;
    try {
      body = (await request.json()) as SubscribeBody;
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { subscription, preferences } = body;

    if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
      return errorResponse('Missing required subscription fields', 400);
    }

    if (!preferences?.frequency || !['immediate', 'daily-digest'].includes(preferences.frequency)) {
      return errorResponse('Invalid frequency value', 400);
    }

    const stored = await addSubscription(subscription, preferences);
    return jsonResponse({ ok: true, createdAt: stored.createdAt }, 201);
  }

  if (method === 'DELETE') {
    let body: UnsubscribeBody;
    try {
      body = (await request.json()) as UnsubscribeBody;
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (!body?.endpoint) {
      return errorResponse('Missing endpoint', 400);
    }

    const removed = await removeSubscription(body.endpoint);
    return jsonResponse({ ok: removed });
  }

  return errorResponse('Method not allowed', 405);
}

export const config = { path: '/api/subscribe' };
