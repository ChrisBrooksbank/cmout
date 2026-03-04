/* eslint-disable no-console */
import { writeFile } from 'node:fs/promises';
import { pipeline } from '@huggingface/transformers';
import type { SerializedCmEvent } from '../build-events.js';

interface EmbeddingsJson {
  eventIds: string[];
  vectors: number[][];
}

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

/** Compose the text we embed for each event */
export function composeText(event: SerializedCmEvent): string {
  const parts = [event.title];
  if (event.category) parts.push(event.category);
  if (event.venue) parts.push(event.venue);
  if (event.description) parts.push(event.description);
  return parts.join('. ');
}

export async function generateEmbeddings(
  events: SerializedCmEvent[],
  outputPath: string
): Promise<EmbeddingsJson> {
  console.log(`Generating embeddings for ${events.length} events...`);

  const extractor = await pipeline('feature-extraction', MODEL_NAME, {
    dtype: 'fp32',
  });

  const texts = events.map(composeText);
  const batchSize = 64;
  const allVectors: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const output = await extractor(batch, { pooling: 'mean', normalize: true });
    // output.tolist() returns number[][] for batched input
    const batchVectors = output.tolist() as number[][];
    allVectors.push(...batchVectors);

    if (i + batchSize < texts.length) {
      console.log(`  Embedded ${Math.min(i + batchSize, texts.length)}/${texts.length} events`);
    }
  }

  const result: EmbeddingsJson = {
    eventIds: events.map(e => e.id),
    vectors: allVectors,
  };

  await writeFile(outputPath, JSON.stringify(result), 'utf-8');
  console.log(
    `Written embeddings to ${outputPath} (${events.length} vectors, ${allVectors[0]?.length ?? 0} dimensions)`
  );

  return result;
}
