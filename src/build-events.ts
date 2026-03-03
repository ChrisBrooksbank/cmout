process.env.TZ = 'Europe/London';
import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CmEvent } from './types.js';
import { aggregateEvents } from './aggregator.js';

/** CmEvent with Date fields serialised as ISO strings for JSON consumption */
export interface SerializedCmEvent extends Omit<CmEvent, 'startDate' | 'endDate'> {
  startDate: string;
  endDate: string | null;
}

export interface EventsJson {
  fetchedAt: string;
  totalEvents: number;
  events: SerializedCmEvent[];
}

function serializeEvent(ev: CmEvent): SerializedCmEvent {
  return {
    ...ev,
    startDate: ev.startDate.toISOString(),
    endDate: ev.endDate ? ev.endDate.toISOString() : null,
  };
}

const DEFAULT_OUTPUT = join(process.cwd(), 'public', 'events.json');

export async function buildEventsJson(outputPath: string = DEFAULT_OUTPUT): Promise<EventsJson> {
  const result = await aggregateEvents();

  const output: EventsJson = {
    fetchedAt: result.fetchedAt.toISOString(),
    totalEvents: result.totalDeduped,
    events: result.events.map(serializeEvent),
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  return output;
}

async function main() {
  console.log('Building public/events.json...');
  const output = await buildEventsJson();
  console.log(`Written ${output.totalEvents} events to public/events.json`);
}

// Only run when this file is the entry point
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
