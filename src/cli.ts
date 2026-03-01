import "dotenv/config";
import type { EventSource } from "./types.js";
import { aggregateEvents, printReport } from "./aggregator.js";

const VALID_SOURCES: EventSource[] = [
  "openactive",
  "skiddle",
  "ents24",
  "ticketmaster",
  "ical",
  "dice",
];

function parseArgs(): { sources?: EventSource[] } {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf("--source");

  if (sourceIdx === -1) return {};

  const sourceArg = args[sourceIdx + 1];
  if (!sourceArg) {
    console.error("Missing value for --source");
    process.exit(1);
  }

  if (sourceArg === "all") return {};

  const sources = sourceArg.split(",") as EventSource[];
  for (const s of sources) {
    if (!VALID_SOURCES.includes(s)) {
      console.error(
        `Unknown source: ${s}. Valid: ${VALID_SOURCES.join(", ")}`
      );
      process.exit(1);
    }
  }

  return { sources };
}

async function main() {
  const { sources } = parseArgs();

  console.log("Chelmsford Events Aggregator");
  console.log(
    `Fetching from: ${sources ? sources.join(", ") : "all sources"}...`
  );

  const result = await aggregateEvents(sources);
  printReport(result);

  // Also write raw JSON output for inspection
  const outputPath = "events-output.json";
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    outputPath,
    JSON.stringify(
      result.events,
      (key, value) => (value instanceof Date ? value.toISOString() : value),
      2
    )
  );
  console.log(`Raw JSON written to ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
