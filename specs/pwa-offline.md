# PWA Offline & Install

## Overview

Make the app installable as a Progressive Web App with offline support for previously viewed events.

## User Stories

- As a user, I want to install the app on my phone so that I can access it like a native app
- As a user, I want to see previously loaded events when offline so that I can check details without internet
- As a user, I want the app to sync when I come back online so that I see the latest events

## Requirements

- [ ] Web app manifest with app name, icons, theme colour, and display mode
- [ ] Service worker for caching static assets (app shell)
- [ ] Cache API or IndexedDB for storing event data offline
- [ ] Offline-first strategy: show cached data, fetch updates in background
- [ ] Install prompt handling (beforeinstallprompt)
- [ ] Offline indicator banner when network is unavailable
- [ ] Background sync to refresh event data when connectivity returns

## Acceptance Criteria

- [ ] Lighthouse PWA audit passes
- [ ] App is installable on Chrome/Edge/Safari
- [ ] Previously loaded events are viewable offline
- [ ] Offline indicator appears when network is lost
- [ ] Data refreshes automatically when coming back online
- [ ] Service worker caches app shell assets

## Out of Scope

- Push notification subscription (covered in notifications spec)
- Server-side rendering
- App store distribution
