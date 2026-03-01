import 'dotenv/config';
import { aggregateEvents } from './aggregator.js';

const result = await aggregateEvents();
const now = new Date();
const twoWeeks = new Date();
twoWeeks.setDate(twoWeeks.getDate() + 14);

const upcoming = result.events.filter(e => e.startDate >= now && e.startDate <= twoWeeks);

// Group by date
const byDate = new Map<string, typeof upcoming>();
for (const ev of upcoming) {
  const key = ev.startDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (!byDate.has(key)) byDate.set(key, []);
  byDate.get(key)!.push(ev);
}

let md = '# Upcoming Events in Chelmsford\n\n';
const activeSources = result.rawResults.filter(r => r.events.length > 0).map(r => r.source);
md += `> Sources: ${activeSources.join(', ')} | Generated: ${now.toLocaleDateString('en-GB')}\n\n`;

for (const [date, events] of byDate) {
  md += `## ${date}\n\n`;
  md += '| Time | Event | Venue | Price |\n';
  md += '|------|-------|-------|-------|\n';

  const seen = new Set<string>();
  let count = 0;
  for (const ev of events) {
    const time = ev.startDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dedup = `${time}|${ev.title}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);
    if (count >= 25) {
      md += `| | *...and more* | | |\n`;
      break;
    }
    md += `| ${time} | ${ev.title} | ${ev.venue} | ${ev.price ?? '—'} |\n`;
    count++;
  }
  md += '\n';
}

md += '---\n\n';
md += '## Coverage Summary\n\n';
md += `- **Total events (next 14 days):** ${upcoming.length}\n`;
md += `- **Sources active:** ${activeSources.join(', ')}\n`;
const pendingSources = result.rawResults
  .filter(r => r.errors.length > 0 && r.events.length === 0)
  .map(r => r.source);
if (pendingSources.length > 0) {
  md += `- **Sources pending:** ${pendingSources.join(', ')}\n`;
}
const venueSet = new Set(upcoming.map(e => e.venue));
md += `- **Venues (${venueSet.size}):** ${[...venueSet].sort().join(', ')}\n`;

process.stdout.write(md);
