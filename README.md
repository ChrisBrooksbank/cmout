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
- Optional live music enrichment with Spotify and YouTube artist links
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
npm run typecheck && npm run lint && npm run test:run
```

## Optional Event Enrichment

Live music event pages can show Spotify and YouTube artist links when confident matches are found. Add these optional keys to `.env`:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
```

Create Spotify credentials in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). For YouTube, create a Google Cloud API key with the YouTube Data API v3 enabled.

Regenerate bundled event data after adding keys:

```bash
npm run build:events
```

## Deployment

Deployed on Netlify. Event data is fetched and bundled at build time.
