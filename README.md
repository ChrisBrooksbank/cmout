# cmout

Discover what's on in Chelmsford. A PWA that aggregates local events from multiple sources into one clean, mobile-first interface.

**Live:** https://cmout.netlify.app

## Data Sources

- OpenActive
- Skiddle
- Ticketmaster
- Ents24
- Dice
- WeGotTickets
- Meetup
- iCal feeds

## Features

- Aggregated local events in one place
- Mobile-first PWA — installable, works offline
- Semantic search powered by in-browser embeddings (Transformers.js)
- Netlify serverless functions for data fetching

## Tech Stack

- Vite + React + TypeScript
- @huggingface/transformers (in-browser semantic search)
- Netlify Functions
- ESLint + Prettier + Husky + Vitest + Playwright

## Development

```bash
npm install
npm run dev          # Start dev server (UI only)
npm run fetch:all    # Fetch events from all sources
npm run build        # Production build
npm run check        # Run all checks
```

## Deployment

Deployed on Netlify. Event data is fetched and bundled at build time.
