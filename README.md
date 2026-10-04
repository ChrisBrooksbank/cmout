# cmout

Discover what's on in Chelmsford. A PWA that aggregates local events from multiple sources into one clean, mobile-first interface.

**Live:** https://cmout.netlify.app

<p align="center">
  <img src="docs/demo.gif" alt="Browsing cmout on a phone: the day-by-day feed, opening grouped leisure-centre sessions, an event page with directions and add-to-calendar, the weekend filter, and switching theme" width="300" />
</p>

## Features

- **One feed for Chelmsford** — gigs, theatre, comedy, fitness classes, sport, community and family events, deduplicated across sources
- **Day-by-day browsing** — events grouped under Today, Tomorrow and each following day, a week at a time; one-off events come first, while leisure-centre timetables are folded into a "Sports & fitness sessions" section with one card per activity and a button for each session time
- **Event pages** — readable dates ("Today · 19:30–23:00"), booking link, directions, add to calendar (.ics) and share; the phone's back button returns you to where you were in the list
- **Quick filters** — Today, Tomorrow, Weekend, This week (Mon–Sun), This month or a specific date, plus category, venue and promoter filters (tucked behind a single Filters button on phones); your filter choices are remembered
- **Smart search** — optional semantic search that runs entirely in the browser (Transformers.js, ~23 MB model), so "fun for kids" finds relevant events even without matching keywords; falls back to keyword search
- **Installable PWA** — works offline from cached data, light/dark/system theme and adjustable text size
- **Daily digest notifications** — opt-in web push with upcoming events in the categories you choose, without repeats; the app only offers notifications once you've come back on a few different days, and "Not now" is remembered for 30 days

## Data Sources

| Source                                  | Method                  | Needs credentials                          |
| --------------------------------------- | ----------------------- | ------------------------------------------ |
| OpenActive (Chelmsford City Sports)     | RPDE open data feeds    | No                                         |
| Skiddle                                 | API                     | `SKIDDLE_API_KEY`                          |
| Ticketmaster                            | Discovery API           | `TICKETMASTER_API_KEY`                     |
| Ents24                                  | API                     | `ENTS24_CLIENT_ID`, `ENTS24_CLIENT_SECRET` |
| Outsavvy                                | Partner API             | `OUTSAVVY_API_KEY`                         |
| DICE (Hot Box)                          | Venue page data         | No                                         |
| WeGotTickets (Black Frog Presents)      | HTML scraping           | No (`WEGOTTICKETS_URL` optional)           |
| Meetup                                  | Search page data        | No                                         |
| Eventbrite                              | Search page data        | No                                         |
| See Tickets                             | JSON-LD / HTML scraping | No                                         |
| Chelmsford Theatre                      | HTML scraping           | No                                         |
| Chelmsford Theatre Workshop (Old Court) | HTML scraping           | No                                         |
| iCal feeds                              | iCalendar               | `ICAL_FEED_URLS` (comma-separated)         |

Put credentials in a `.env` file locally, or in the Netlify environment for deploys. Sources without credentials are skipped and reported in the build log.

## How it works

1. **Build time** — `npm run build:events` fetches every source in parallel, drops events that have already finished, validates event links, deduplicates the same event listed by different sources (repeat sessions from one source are kept), and writes `public/events.json` plus `public/embeddings.json` for smart search. Problems (failed sources, links that look broken) are printed in the build log.
2. **Front end** — a Vite + React app loads `events.json` and does all filtering and search in the browser. A Workbox service worker caches the app and event data for offline use.
3. **Serverless** — Netlify Functions handle push subscriptions (`/api/subscribe`, stored in Netlify Blobs) and send the daily digest on a schedule.

The site is rebuilt every morning by a GitHub Actions workflow that calls a Netlify build hook, so event data is at most a day old.

### Monitoring

A daily **Site health check** workflow (`.github/workflows/site-health.yml`, also runnable by hand) checks the live site:

- the event data is less than 36 hours old (i.e. the daily rebuild worked);
- no source has disappeared or dropped by more than half since the previous run — usually the first sign that a site changed its page or API format;
- a sample of real event links per source still load (404s and server errors count as broken; sites that block automated requests are listed as warnings).

When something fails it opens a GitHub issue labelled `site-health` (or comments on the open one), and closes it once checks pass again. Run it locally with `npx tsx scripts/check-site-health.ts`.

## Tech Stack

- Vite + React + TypeScript
- @huggingface/transformers (in-browser semantic search)
- Workbox via vite-plugin-pwa
- Netlify (hosting, Functions, Blobs, scheduled functions)
- ESLint + Prettier + Knip + Husky + Vitest + Playwright

## Development

```bash
npm install
npm run dev:ui          # Start the UI dev server (uses public/events.json)
npm run build:events    # Fetch all sources and regenerate public/events.json + embeddings
npm run fetch:all       # Fetch all sources and print a coverage report (writes events-output.json)
npm run fetch:skiddle   # ...or a single source (openactive, ticketmaster, dice, meetup, …)
npm run build:ui        # Production build of the UI into build/
```

Checks (the same ones CI runs):

```bash
npm run typecheck
npm run lint
npm run format:check
npm run knip
npm run test:run        # Vitest unit tests
npm run test:e2e        # Playwright end-to-end tests
```

The visual regression test (`e2e/visual.spec.ts`) uses fixed data and a frozen clock. After an intended UI change, run the **Update visual snapshots** workflow in GitHub Actions to regenerate its baselines on the Linux runner.

Push notifications need VAPID keys: run `npx tsx scripts/generate-vapid-keys.ts` and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`.

## Deployment

Deployed on Netlify. The build command (`netlify.toml`) runs `npm run build:events && npm run build:ui`, so every deploy fetches fresh event data.

## License

MIT
