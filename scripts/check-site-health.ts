/**
 * Check the live site's event data and a sample of event links.
 *
 * Usage:
 *   npx tsx scripts/check-site-health.ts
 *
 * Environment:
 *   SITE_URL         Site to check (default https://cmout.netlify.app)
 *   PREVIOUS_COUNTS  JSON file with the previous run's events-per-source (optional)
 *   COUNTS_OUT       Where to write this run's events-per-source (optional)
 *   REPORT_OUT       Where to write the Markdown report (optional)
 *   LINKS_PER_SOURCE Links to check per source (default 5)
 *
 * Exits 1 when there are problems, so the workflow can open an issue.
 */
/* eslint-disable no-console */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  formatReport,
  runHealthCheck,
  type LiveEventsJson,
  type SourceCounts,
} from '../src/health/site-health.js';

const siteUrl = (process.env.SITE_URL || 'https://cmout.netlify.app').replace(/\/$/, '');

function readPrevious(): SourceCounts | null {
  const path = process.env.PREVIOUS_COUNTS;
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as SourceCounts;
  } catch {
    return null;
  }
}

async function main() {
  const res = await fetch(`${siteUrl}/events.json`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed to load ${siteUrl}/events.json (HTTP ${res.status})`);
  const data = (await res.json()) as LiveEventsJson;

  const previous = readPrevious();
  const report = await runHealthCheck({
    data,
    previousCounts: previous,
    perSource: Number(process.env.LINKS_PER_SOURCE) || 5,
  });
  const markdown = formatReport(report, siteUrl, previous);

  console.log(markdown);
  if (process.env.COUNTS_OUT) writeFileSync(process.env.COUNTS_OUT, JSON.stringify(report.counts));
  if (process.env.REPORT_OUT) writeFileSync(process.env.REPORT_OUT, markdown);
  process.exitCode = report.problems.length > 0 ? 1 : 0;
}

main().catch(err => {
  const message = `### ❌ Problems\n\n- Health check could not run: ${(err as Error).message}`;
  console.error(message);
  if (process.env.REPORT_OUT) writeFileSync(process.env.REPORT_OUT, message);
  process.exitCode = 1;
});
