/**
 * Daily health check for the live site: is the data fresh, did any source
 * suddenly drop (usually a source changing its page/API format), and do a
 * sample of real event links still work?
 */

export interface LiveEvent {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  startDate: string;
}

export interface LiveEventsJson {
  fetchedAt: string;
  events: LiveEvent[];
}

export type SourceCounts = Record<string, number>;

export interface LinkResult {
  source: string;
  title: string;
  url: string;
  status: number | null;
  verdict: 'ok' | 'broken' | 'blocked';
  detail?: string;
}

export interface HealthReport {
  problems: string[];
  warnings: string[];
  counts: SourceCounts;
  links: LinkResult[];
}

/** Data older than this means the daily rebuild didn't run or failed. */
const MAX_DATA_AGE_HOURS = 36;
/** A source is flagged when it falls below this share of the previous run's count... */
const DROP_RATIO = 0.5;
/** ...but only if it previously had at least this many events (small sources fluctuate). */
const MIN_COUNT_FOR_DROP = 5;

function countBySource(events: LiveEvent[]): SourceCounts {
  const counts: SourceCounts = {};
  for (const ev of events) counts[ev.source] = (counts[ev.source] ?? 0) + 1;
  return counts;
}

export function checkFreshness(fetchedAt: string, now: Date = new Date()): string | null {
  const ageHours = (now.getTime() - new Date(fetchedAt).getTime()) / 3_600_000;
  if (Number.isNaN(ageHours)) return `events.json has an invalid fetchedAt ("${fetchedAt}")`;
  if (ageHours > MAX_DATA_AGE_HOURS) {
    return `Event data is ${Math.round(ageHours)} hours old (fetched ${fetchedAt}) — the daily rebuild may have failed`;
  }
  return null;
}

/** Sources that disappeared or dropped sharply since the previous run. */
export function compareCounts(previous: SourceCounts, current: SourceCounts): string[] {
  const problems: string[] = [];
  for (const [source, before] of Object.entries(previous)) {
    if (before < MIN_COUNT_FOR_DROP) continue;
    const now = current[source] ?? 0;
    if (now === 0) {
      problems.push(`**${source}** returned no events (previously ${before})`);
    } else if (now < before * DROP_RATIO) {
      problems.push(`**${source}** dropped from ${before} to ${now} events`);
    }
  }
  return problems;
}

/**
 * Pick up to `perSource` links per source to check, preferring upcoming events
 * and distinct URLs, spread across the source's list.
 */
export function pickSample(
  events: LiveEvent[],
  perSource: number,
  now: Date = new Date()
): LiveEvent[] {
  const bySource = new Map<string, LiveEvent[]>();
  const seen = new Set<string>();
  for (const ev of events) {
    if (!ev.sourceUrl || seen.has(ev.sourceUrl)) continue;
    if (new Date(ev.startDate) < now) continue;
    seen.add(ev.sourceUrl);
    const list = bySource.get(ev.source) ?? [];
    list.push(ev);
    bySource.set(ev.source, list);
  }
  const sample: LiveEvent[] = [];
  for (const list of bySource.values()) {
    const take = Math.min(perSource, list.length);
    // Evenly spaced through the list, so one bad page of results is likely to show up
    for (let k = 0; k < take; k++) sample.push(list[Math.floor((k * list.length) / take)]);
  }
  return sample;
}

/**
 * 404/410 and server errors are broken links. 401/403/429 usually mean the site
 * blocks automated requests, so they're reported but not treated as broken.
 */
export function classifyStatus(status: number): LinkResult['verdict'] {
  if (status === 401 || status === 403 || status === 429) return 'blocked';
  if (status >= 400) return 'broken';
  return 'ok';
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; cmout-link-check/1.0; +https://github.com/ChrisBrooksbank/cmout)';

async function checkLink(
  ev: LiveEvent,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15_000
): Promise<LinkResult> {
  const base = { source: ev.source, title: ev.title, url: ev.sourceUrl };
  // One retry so a single transient failure doesn't raise an alarm
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(ev.sourceUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      await res.body?.cancel().catch(() => {});
      const verdict = classifyStatus(res.status);
      if (verdict !== 'broken' || attempt === 1) return { ...base, status: res.status, verdict };
    } catch (err) {
      lastError = (err as Error).message;
    }
  }
  return { ...base, status: null, verdict: 'broken', detail: lastError || 'request failed' };
}

export async function runHealthCheck({
  data,
  previousCounts,
  perSource = 5,
  now = new Date(),
  fetchImpl = fetch,
}: {
  data: LiveEventsJson;
  previousCounts: SourceCounts | null;
  perSource?: number;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<HealthReport> {
  const problems: string[] = [];
  const warnings: string[] = [];

  const stale = checkFreshness(data.fetchedAt, now);
  if (stale) problems.push(stale);

  const counts = countBySource(data.events);
  if (previousCounts) problems.push(...compareCounts(previousCounts, counts));

  const sample = pickSample(data.events, perSource, now);
  const links: LinkResult[] = [];
  // A few at a time to stay polite to the sites being checked
  for (let i = 0; i < sample.length; i += 4) {
    links.push(...(await Promise.all(sample.slice(i, i + 4).map(ev => checkLink(ev, fetchImpl)))));
  }
  const blocked = new Map<string, Set<number | null>>();
  for (const link of links) {
    if (link.verdict === 'broken') {
      const status = link.status ?? link.detail;
      problems.push(`Broken link (${status}) for **${link.title}** [${link.source}]: ${link.url}`);
    } else if (link.verdict === 'blocked') {
      blocked.set(link.source, (blocked.get(link.source) ?? new Set()).add(link.status));
    }
  }
  for (const [source, statuses] of blocked) {
    const n = links.filter(l => l.source === source && l.verdict === 'blocked').length;
    warnings.push(
      `**${source}**: ${n} link(s) couldn't be checked (HTTP ${[...statuses].join('/')} — the site blocks automated requests)`
    );
  }

  return { problems, warnings, counts, links };
}

export function formatReport(
  report: HealthReport,
  siteUrl: string,
  previous: SourceCounts | null
): string {
  const lines: string[] = [];
  lines.push(report.problems.length ? '### ❌ Problems' : '### ✅ All checks passed', '');
  for (const p of report.problems) lines.push(`- ${p}`);
  if (report.problems.length) lines.push('');
  if (report.warnings.length) {
    lines.push('### Warnings', '');
    for (const w of report.warnings) lines.push(`- ${w}`);
    lines.push('');
  }
  lines.push('### Events per source', '', '| Source | Events | Previous run |', '|---|---:|---:|');
  const sources = new Set([...Object.keys(report.counts), ...Object.keys(previous ?? {})]);
  for (const source of [...sources].sort()) {
    lines.push(
      `| ${source} | ${report.counts[source] ?? 0} | ${previous ? (previous[source] ?? 0) : '—'} |`
    );
  }
  const ok = report.links.filter(l => l.verdict === 'ok').length;
  lines.push('', `Checked ${report.links.length} links on ${siteUrl}: ${ok} OK.`);
  return lines.join('\n');
}
