import type { CmEvent } from '../types';

export interface Embeddings {
  eventIds: string[];
  vectors: number[][];
}

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const SIMILARITY_THRESHOLD = 0.3;

type Extractor = (
  text: string,
  options: { pooling: string; normalize: boolean }
) => Promise<{ tolist(): number[][] }>;

let extractor: Extractor | null = null;
let loadingPromise: Promise<void> | null = null;

/** Lazy-load the embedding model. Call early (e.g. on search focus) to warm up. */
export async function initModel(): Promise<void> {
  if (extractor) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    extractor = (await pipeline('feature-extraction', MODEL_NAME, {
      dtype: 'fp32',
    })) as unknown as Extractor;
  })();
  loadingPromise.catch(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

/** Returns true if the model is loaded and ready */
export function isModelReady(): boolean {
  return extractor !== null;
}

/** Embed a query string. Model must be loaded first via initModel(). */
export async function embedQuery(text: string): Promise<Float32Array> {
  if (!extractor) throw new Error('Model not loaded — call initModel() first');
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  const nested = output.tolist();
  return new Float32Array(nested[0]);
}

/** Cosine similarity between two vectors (both assumed to be normalised) */
export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/** Rank events by semantic similarity to the query. Returns events above threshold, sorted by relevance. */
export async function semanticSearch(
  query: string,
  embeddings: Embeddings,
  events: CmEvent[]
): Promise<CmEvent[]> {
  const queryVec = await embedQuery(query);

  // Build a map from event ID to event for fast lookup
  const eventMap = new Map<string, CmEvent>();
  for (const ev of events) {
    eventMap.set(ev.id, ev);
  }

  // Score each event
  const scored: { event: CmEvent; score: number }[] = [];
  for (let i = 0; i < embeddings.eventIds.length; i++) {
    const event = eventMap.get(embeddings.eventIds[i]);
    if (!event) continue;
    const score = cosineSimilarity(queryVec, embeddings.vectors[i]);
    if (score >= SIMILARITY_THRESHOLD) {
      scored.push({ event, score });
    }
  }

  // Sort by descending similarity
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.event);
}
