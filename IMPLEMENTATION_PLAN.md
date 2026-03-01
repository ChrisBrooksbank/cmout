# Implementation Plan

## Status

- Planning iterations: 1
- Build iterations: 1
- Last updated: 2026-03-01

## Tasks

### Foundation

- [x] Add vite.config.ts and scaffold React app entry (src/main.tsx, src/App.tsx, update public/index.html) (spec: event-listing-ui.md)
- [x] Add static data build step: run aggregators → write public/events.json for frontend consumption (spec: event-listing-ui.md)

### Event Listing UI (spec: event-listing-ui.md)

- [x] Build EventCard component (title, date/time, venue, category badge, price, image) with unit tests
- [x] Build EventList component (renders list of EventCards, handles empty state) with unit tests
- [x] Build CategoryFilter component (all 11 categories, multi-select) with unit tests
- [x] Build SearchBar component (text search, debounced) with unit tests
- [ ] Build DateRangeFilter component (today / this week / this month / all) with unit tests
- [ ] Build EventDetail view/modal (full event info, back navigation) with unit tests
- [ ] Wire up App.tsx: fetch events.json, combine filters, render list + filters + loading/error states

### PWA Offline (spec: pwa-offline.md)

- [ ] Add web app manifest (public/manifest.json): name, icons, theme colour, display standalone
- [ ] Add service worker (src/sw.ts via vite-plugin-pwa or manual): cache app shell on install
- [ ] Add offline event data strategy: cache events.json in Cache API, serve stale-while-revalidate
- [ ] Add offline indicator UI component (banner shown when navigator.onLine is false)
- [ ] Add install prompt handling (beforeinstallprompt event, show install button in UI)
- [ ] Add background sync: re-fetch events.json when connectivity restored

### Push Notifications (spec: push-notifications.md)

- [ ] Add push permission request UI (button + explanatory text, only shown after user interaction)
- [ ] Add notification preferences UI: category checkboxes + frequency selector (immediate / daily digest)
- [ ] Generate VAPID keys and add server-side subscription store (edge function or serverless endpoint)
- [ ] Add service worker push event handler: show notification with title, body, icon, event URL
- [ ] Add notificationclick handler in service worker: focus/open event detail page
- [ ] Add daily digest scheduler: aggregate new events and send batched push once per day

## Completed

<!-- Completed tasks move here -->

## Notes

### Architecture Decisions

**Data flow**: Aggregators run at build time (or via cron) → write `public/events.json` → React frontend
fetches this static file. No runtime server required for the core UI.

**React + Vite**: `react` and `react-dom` are already in devDependencies. Use Vite (already a dep via
`@vitejs/plugin-react`) for the frontend bundle. The current `public/index.html` (coming-soon page) will
be replaced by the Vite app shell.

**Service worker**: Use `vite-plugin-pwa` (or Workbox directly) to generate the service worker and
manifest during the Vite build. This avoids manual service worker maintenance.

**Push notifications**: Require a server component (VAPID endpoint). Consider Cloudflare Workers or
Netlify Functions as a lightweight serverless option to store subscriptions and send pushes.

**Source priority for dedup** (already implemented): openactive > skiddle > ents24 > ticketmaster > dice > ical
