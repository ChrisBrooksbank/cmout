# Notifications Plan

CmOut already has partial notification scaffolding: a permission prompt, local
notification preferences, a service-worker push handler, a `/api/subscribe`
Netlify Function, and digest-selection logic. The next step is to turn that
prototype into a reliable Netlify-hosted web push system.

## Goal

Send useful event notifications based on user preferences, starting with a daily
digest of new Chelmsford events matching selected categories.

## Phase 1: Real Browser Subscription

- Update `PushNotificationPrompt` so enabling notifications:
  - requests notification permission;
  - waits for the service worker registration;
  - creates a `PushSubscription` with `registration.pushManager.subscribe`;
  - sends the subscription and preferences to `/api/subscribe`.
- Expose the VAPID public key to the client, for example via Vite env.
- Add unsubscribe and preference-update flows from settings.
- Keep the prompt user-led and avoid showing it before meaningful interaction.

## Phase 2: Persistent Subscription Storage

- Replace the prototype in-memory `Map` in `src/push/subscription-store.ts`.
- Use Netlify Blobs as the first production storage option.
- Store subscriptions by endpoint.
- Persist:
  - push subscription endpoint and keys;
  - selected categories;
  - notification frequency;
  - creation/update timestamps;
  - last digest sent marker.
- Keep test helpers for clearing or seeding storage.

## Phase 3: Real Web Push Delivery

- Add the `web-push` package.
- Configure Netlify environment variables:
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`
- Create a push sender helper around `webpush.sendNotification`.
- Remove expired subscriptions when push services return gone/invalid responses.
- Add a safe test-notification path for manual verification.

## Phase 4: Notification Types

Start with daily digests:

- one notification per subscriber per day;
- only events matching selected categories;
- only events not already included in a previous digest.

Later options:

- immediate alerts for newly added high-interest events;
- notifications based on saved filter preferences;
- reminders for events happening today or tomorrow.

## Phase 5: Scheduled Netlify Function

- Add `netlify/functions/daily-digest.ts`.
- Schedule it to run once each morning.
- Load event data from the built `events.json` or the same source used to build
  it.
- For each daily-digest subscriber:
  - select matching new events;
  - build a concise digest payload;
  - send the push notification;
  - update the subscriber's last sent marker.

## Phase 6: Settings UX

- Move notification controls into the existing settings experience.
- Include:
  - enable/disable notifications;
  - category checkboxes;
  - frequency selection;
  - test notification button;
  - browser-blocked explanation when permission is denied.
- Make notification copy specific and calm: avoid over-promising immediacy.

## Phase 7: Testing And Deployment

- Unit test:
  - subscription create/update/delete;
  - preference validation;
  - digest matching;
  - expired subscription cleanup;
  - service-worker notification click behavior.
- Verify locally with the Netlify dev server where practical.
- Deploy to Netlify and confirm:
  - environment variables are present;
  - `/api/subscribe` persists subscriptions;
  - the scheduled function runs;
  - a test push arrives on a real browser/device.

## Recommended First Slice

Implement persistent subscription storage with Netlify Blobs and real
`PushManager.subscribe` wiring. That turns the current permission prompt into
working notification infrastructure without taking on scheduling and digest
delivery all at once.
