# CmOut PWA — Implementation Plan

## Context

We have a working Node.js event aggregator that fetches from 4 active sources (OpenActive, Skiddle, Ticketmaster, DICE) producing ~1,025 deduplicated events across 13 Chelmsford venues. It's deployed as a holding page at https://cmout.netlify.app. Now we need to build the actual PWA so users can browse, search, filter, map, and favourite events.

## Tech Choices

- **React + Vite** (user choice)
- **Hybrid data freshness**: static `events.json` at build time + Netlify Function for on-demand refresh
- **PWA**: vite-plugin-pwa (Workbox) for offline + install
- **Map**: Leaflet + react-leaflet (free, OSM tiles)
- **Favourites**: IndexedDB via `idb` library
- **Styling**: Plain CSS with CSS modules, dark theme from existing holding page
- **Virtual scrolling**: @tanstack/react-virtual (1000+ events)

## Step 1: Restructure — Move Aggregator Code

Move existing Node.js code into `src/aggregator/` to separate it from the React app.

```
src/aggregator/          ← MOVE existing files here
  aggregator.ts
  cli.ts
  types.ts
  utils.ts
  generate-markdown.ts
  generate-events-json.ts  ← NEW
  fetchers/
    index.ts
    openactive.ts
    skiddle.ts
    ents24.ts
    ticketmaster.ts
    ical.ts
    dice.ts
```

- Update all internal import paths
- Verify: `npx tsx src/aggregator/cli.ts --source all` still works

## Step 2: Vite + React Scaffold

Install deps and create build config.

**New dependencies:**
```
react react-dom react-router-dom
leaflet react-leaflet react-leaflet-cluster
idb
@tanstack/react-virtual
@vitejs/plugin-react vite vite-plugin-pwa
@types/react @types/react-dom @types/leaflet
```

**New files:**
- `vite.config.ts` — Vite + VitePWA plugin (workbox config for events.json StaleWhileRevalidate + OSM tile CacheFirst)
- `tsconfig.json` — update for React JSX, `include: ["src/app/**/*"]`
- `tsconfig.node.json` — separate config for aggregator (Node target)
- `index.html` at project root (Vite entry, replaces `public/index.html`)
- `src/app/main.tsx` — React entry point
- `src/app/App.tsx` — Routes + providers

**Verify:** `npx vite` starts dev server, page renders.

## Step 3: Build Pipeline

Create `src/aggregator/generate-events-json.ts` — runs aggregator, writes `events.json` to `dist/`.

**package.json scripts:**
```json
"dev": "vite",
"build": "vite build && tsx src/aggregator/generate-events-json.ts",
"preview": "vite preview",
"fetch:all": "tsx src/aggregator/cli.ts --source all"
```

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Verify:** `npm run build` produces `dist/index.html` + `dist/events.json`.

## Step 4: Data Loading + Event List

**Files:**
- `src/app/types.ts` — `CmEventJSON` (same as CmEvent but dates are ISO strings)
- `src/app/hooks/useEvents.ts` — fetch `/events.json`, provide via React Context. Background-check `/api/refresh-events` for newer data.
- `src/app/components/Layout.tsx` — shell with fixed bottom tab nav (Events, Map, Favourites)
- `src/app/components/EventCard.tsx` — compact card: date/time, title, venue, category chip, price, heart icon
- `src/app/components/EventList.tsx` — virtual scrolling list with `@tanstack/react-virtual`

For dev: copy a pre-generated `events.json` into `public/` so Vite serves it.

**Verify:** browse events in dev server.

## Step 5: Filtering + Search

**Files:**
- `src/app/lib/filters.ts` — pure filter functions (category, date range, venue, text search)
- `src/app/hooks/useFilters.ts` — filter state + derived `filteredEvents` array
- `src/app/components/FilterBar.tsx` — horizontal scrollable category chips + date range inputs
- `src/app/components/SearchBar.tsx` — debounced text input (300ms)

**Verify:** filters narrow results, event count updates.

## Step 6: Event Detail

**Files:**
- `src/app/components/EventDetail.tsx` — slide-up modal with full info: image, title, description, venue, date/time, price, category, source, "View Original" link, favourite toggle

**Verify:** tapping EventCard opens detail, links work.

## Step 7: Map View

**Files:**
- `src/app/components/MapView.tsx` — Leaflet map centred on Chelmsford (51.7356, 0.4685), marker clustering, popups with event info, uses same filtered events as list view

Lazy-load with `React.lazy()` to keep initial bundle small. Fix Leaflet marker icons for bundler compatibility.

**Verify:** map renders, markers cluster, popups link to detail.

## Step 8: Favourites

**Files:**
- `src/app/lib/db.ts` — IndexedDB wrapper using `idb` (getFavouriteIds, addFavourite, removeFavourite, getAllFavourites)
- `src/app/hooks/useFavourites.ts` — React hook + context for toggle/check
- `src/app/components/FavouritesView.tsx` — list of saved events, empty state prompt

**Verify:** favourite persists across reloads, remove works.

## Step 9: PWA Setup

VitePWA config in `vite.config.ts`:
- Precache app shell (JS/CSS/HTML/icons)
- StaleWhileRevalidate for `/events.json` (1hr max age)
- CacheFirst for OSM tiles (7-day, max 200)
- Manifest: name, icons (192 + 512), theme colour, standalone display

Create `public/icons/icon-192.png` and `icon-512.png`.

**Verify:** Lighthouse PWA audit green, app installable, works offline.

## Step 10: Netlify Function

**File:** `netlify/functions/refresh-events.mts`
- Imports aggregator directly
- Runs `aggregateEvents()`, serialises dates to ISO strings
- Returns JSON with `Cache-Control: public, max-age=900` (15min CDN cache)
- No dotenv needed (Netlify injects env vars)

Update `useEvents.ts` to call `/api/refresh-events` in background after loading static data.

**Verify:** `netlify dev` serves function, returns fresh events JSON.

## Step 11: Deploy

- Set env vars in Netlify dashboard (SKIDDLE_API_KEY, TICKETMASTER_API_KEY)
- Push to git, Netlify auto-deploys
- Verify: https://cmout.netlify.app loads PWA, events display, offline works, SPA routing works

## Target File Structure

```
cmout/
├── index.html                          ← Vite entry
├── vite.config.ts
├── tsconfig.json                       ← React app
├── tsconfig.node.json                  ← Aggregator
├── netlify.toml
├── package.json
├── public/
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── netlify/
│   └── functions/
│       └── refresh-events.mts
├── src/
│   ├── aggregator/                     ← Moved existing code
│   │   ├── aggregator.ts
│   │   ├── cli.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── generate-events-json.ts     ← NEW
│   │   ├── generate-markdown.ts
│   │   └── fetchers/
│   │       ├── index.ts
│   │       ├── openactive.ts
│   │       ├── skiddle.ts
│   │       ├── ents24.ts
│   │       ├── ticketmaster.ts
│   │       ├── ical.ts
│   │       └── dice.ts
│   └── app/                            ← NEW: React PWA
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── types.ts
│       ├── hooks/
│       │   ├── useEvents.ts
│       │   ├── useFilters.ts
│       │   └── useFavourites.ts
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── EventList.tsx
│       │   ├── EventCard.tsx
│       │   ├── EventDetail.tsx
│       │   ├── FilterBar.tsx
│       │   ├── SearchBar.tsx
│       │   ├── MapView.tsx
│       │   └── FavouritesView.tsx
│       └── lib/
│           ├── db.ts
│           ├── filters.ts
│           └── date-utils.ts
```

## Design

Dark theme from existing holding page:
- Background: `#1a1a2e`, Cards: `#16213e`, Accent: `#e94560`, Secondary: `#0f3460`
- Text: `#e0e0e0`, Muted: `#a0a0b8`
- Mobile-first, CSS modules

## Key Risks

1. **Netlify Function timeout** (10s free tier) — aggregator hits 4+ APIs in parallel, should be fine (~2s observed). `Promise.allSettled` handles partial failures gracefully.
2. **Large events.json** (~500KB for 1000+ events) — gzip on Netlify CDN reduces significantly. Trim descriptions to 200 chars in build output.
3. **Leaflet bundle size** (~40KB gzip) — lazy-load MapView component.
4. **Timezone display** — use `Intl.DateTimeFormat` with `timeZone: "Europe/London"` for consistent UK times.
