# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Tech Stack

- Node.js + TypeScript (ES modules)
- tsx for dev, tsc for build
- Vitest for unit tests, Playwright for e2e
- ESLint + Prettier for code quality
- Husky + lint-staged for pre-commit hooks

## Build Commands

```bash
npm run build          # tsc production build
npm run dev            # tsx src/cli.ts
```

## Test Commands

```bash
npm run test:run       # Run unit tests once (vitest run)
npm run test:e2e       # Run Playwright e2e tests
npm run test:coverage  # Coverage report
```

## Validation (run before committing)

```bash
npm run typecheck && npm run lint && npm run test:run
```

## Project Notes

- Source files in src/, fetchers in src/fetchers/
- CmEvent interface in src/types.ts is the core event type
- Data sources: OpenActive (working), Skiddle, Ents24, Ticketmaster, iCal
- Dedup logic in src/utils.ts (normalised title + date + venue)
- CLI runner in src/cli.ts with --source flag
