import type { CmEvent } from '../../src/types.js';
import { runDailyDigest } from '../../src/push/digest-scheduler.js';
import { sendDigestPush } from '../../src/push/web-push-sender.js';

interface RawEvent extends Omit<CmEvent, 'startDate' | 'endDate'> {
  startDate: string;
  endDate: string | null;
}

function hydrateEvent(raw: RawEvent): CmEvent {
  return {
    ...raw,
    startDate: new Date(raw.startDate),
    endDate: raw.endDate ? new Date(raw.endDate) : null,
  };
}

function siteUrl(request: Request): string {
  const configured = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (configured) return configured;
  return new URL(request.url).origin;
}

async function loadEvents(request: Request): Promise<CmEvent[]> {
  const response = await fetch(new URL('/events.json', siteUrl(request)));
  if (!response.ok) throw new Error(`Failed to load events.json (${response.status})`);
  const data = (await response.json()) as { events: RawEvent[] };
  return data.events.map(hydrateEvent);
}

export default async function handler(request: Request): Promise<Response> {
  try {
    const events = await loadEvents(request);
    const results = await runDailyDigest(events, undefined, sendDigestPush);
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config = {
  schedule: '0 8 * * *',
};
