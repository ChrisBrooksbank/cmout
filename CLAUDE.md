# CLAUDE.md

## Project Overview

cmout — a Chelmsford events aggregator PWA. Pulls events from OpenActive, Skiddle, Ticketmaster, Ents24, Dice, WeGotTickets, Meetup, and iCal feeds into a single mobile-first interface with semantic search.

**Live:** https://cmout.netlify.app

## Tech Stack

- Vite + React + TypeScript
- @huggingface/transformers (in-browser semantic search)
- Netlify Functions (serverless data fetching)
- ESLint + Prettier + Husky + Knip
- Vitest + Playwright

## Development Commands

```bash
npm run dev           # Start UI dev server
npm run fetch:all     # Fetch events from all sources
npm run fetch:openactive / fetch:skiddle / etc.  # Fetch individual sources
npm run build         # Production build (builds events data + UI)
npm run check         # Lint + typecheck + test + format
npm run test:e2e      # Playwright end-to-end tests
```

## Architecture

- `src/` — React UI (Vite)
- `scripts/` — Event fetching scripts (one per source)
- `netlify/` — Netlify Functions
- `specs/` — JTBD specifications (Ralph Wiggum loop)

## Data Pipeline

Events are fetched at build time by `npm run fetch:all` which runs individual fetch scripts per source. Data is stored as JSON and bundled with the Vite build.

## Deployment

Deployed on Netlify. `netlify.toml` configures the build command and publish directory.
