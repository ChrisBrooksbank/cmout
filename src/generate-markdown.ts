import "dotenv/config";
import { aggregateEvents } from "./aggregator.js";

const result = await aggregateEvents(["openactive"]);
const now = new Date();
const twoWeeks = new Date();
twoWeeks.setDate(twoWeeks.getDate() + 14);

const upcoming = result.events.filter(
  (e) => e.startDate >= now && e.startDate <= twoWeeks
);

// Group by date
const byDate = new Map<string, typeof upcoming>();
for (const ev of upcoming) {
  const key = ev.startDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (!byDate.has(key)) byDate.set(key, []);
  byDate.get(key)!.push(ev);
}

let md = "# Upcoming Events in Chelmsford\n\n";
md += `> Data source: OpenActive (Chelmsford City Sports) | Generated: ${now.toLocaleDateString("en-GB")}\n`;
md += `>\n`;
md += `> **Note:** This only includes fitness/sports/leisure events from OpenActive. Live music, theatre, and community events will appear once Skiddle, Ents24, and Ticketmaster API keys are added.\n\n`;

for (const [date, events] of byDate) {
  md += `## ${date}\n\n`;
  md += "| Time | Event | Venue | Price |\n";
  md += "|------|-------|-------|-------|\n";

  const seen = new Set<string>();
  let count = 0;
  for (const ev of events) {
    const time = ev.startDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dedup = `${time}|${ev.title}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);
    if (count >= 25) {
      md += `| | *...and more* | | |\n`;
      break;
    }
    md += `| ${time} | ${ev.title} | ${ev.venue} | ${ev.price ?? "—"} |\n`;
    count++;
  }
  md += "\n";
}

md += "---\n\n";
md += "## Coverage Summary\n\n";
md += `- **Total events (next 14 days):** ${upcoming.length}\n`;
md += "- **Sources active:** OpenActive (Chelmsford City Sports)\n";
md += "- **Sources pending API keys:** Skiddle, Ents24, Ticketmaster\n";
md += "- **Venues covered:** Riverside Leisure Centre, Chelmsford Sport & Athletics Centre, South Woodham Leisure, Dovedale Sports Centre\n";
md += "- **Venues NOT yet covered:** Hot Box Live, Chelmsford Theatre, Cramphorn Studio, Hylands Estate, Chelmsford Racecourse\n";

process.stdout.write(md);
