# Push Notifications

## Overview

Notify users about new events matching their interests via web push notifications.

## User Stories

- As a user, I want to receive notifications about new events in categories I care about so that I don't miss out
- As a user, I want to control which notifications I receive so that I'm not overwhelmed
- As a user, I want to tap a notification to go directly to the event so that I can see the details

## Requirements

- [ ] Push notification permission request with clear explanation of value
- [ ] Notification preferences UI: toggle by category, frequency (immediate, daily digest)
- [ ] Service worker push event handler to display notifications
- [ ] Notification click handler to navigate to the relevant event
- [ ] Server-side component to track subscriptions and send notifications
- [ ] Daily digest option that batches new events into a single notification
- [ ] Respect system notification settings and quiet hours

## Acceptance Criteria

- [ ] Users can opt in/out of push notifications
- [ ] Notifications show event title, date, and category
- [ ] Tapping a notification opens the event detail view
- [ ] Preference changes are persisted
- [ ] Daily digest sends at a consistent time
- [ ] Notifications work when the app is closed

## Out of Scope

- Email notifications
- SMS notifications
- Social sharing of events
- Location-based notifications
