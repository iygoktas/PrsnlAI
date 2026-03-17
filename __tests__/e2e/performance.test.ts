/**
 * @jest-environment node
 */

/**
 * T-038: Performance — index 100 documents, search latency must be under 500ms
 *
 * Requires: DATABASE_URL, DIRECT_URL, OPENAI_API_KEY (or OLLAMA), ANTHROPIC_API_KEY (or OLLAMA)
 */

// Mock at module level, before importing anything that uses jsdom
jest.mock('jsdom', () => ({
  JSDOM: jest.fn(() => ({
    window: { document: {} },
  })),
}));

jest.mock('@/ingestion/url', () => ({
  ingestUrl: jest.fn(),
}));

import { ingest } from '@/ingestion/index';
import { search } from '@/search/index';
import { deleteSource } from '@/storage/metadata';

const REQUIRED_VARS = ['DATABASE_URL', 'DIRECT_URL'];
const hasEnv = REQUIRED_VARS.every((v) => !!process.env[v]);

const describeIf = hasEnv ? describe : describe.skip;

const SEARCH_LATENCY_TARGET_MS = 500;
const DOCUMENT_COUNT = 100;

describeIf('Performance: search latency with 100 documents', () => {
  // Allow up to 5 minutes to ingest 100 documents
  jest.setTimeout(300_000);

  const createdSourceIds: string[] = [];

  afterAll(async () => {
    // Clean up all created sources
    await Promise.allSettled(createdSourceIds.map((id) => deleteSource(id)));
  });

  it('should index 100 documents and search within 500ms', async () => {
    // Step 1: Ingest 100 short documents (batched to avoid rate limits)
    const topics = [
      'machine learning',
      'neural networks',
      'deep learning',
      'natural language processing',
      'computer vision',
      'reinforcement learning',
      'generative AI',
      'transformer architecture',
      'attention mechanism',
      'gradient descent',
    ];

    const BATCH_SIZE = 10;
    for (let batch = 0; batch < DOCUMENT_COUNT / BATCH_SIZE; batch++) {
      const batchResults = await Promise.all(
        Array.from({ length: BATCH_SIZE }, (_, i) => {
          const docIndex = batch * BATCH_SIZE + i;
          const topic = topics[docIndex % topics.length];
          return ingest({
            type: 'text',
            content:
              `Document ${docIndex + 1} about ${topic}. ` +
              `This document covers the fundamental concepts of ${topic} in artificial intelligence. ` +
              `${topic.charAt(0).toUpperCase() + topic.slice(1)} has transformed how we approach ` +
              `computational problems. Researchers continue to advance ${topic} techniques daily. ` +
              `The applications of ${topic} span across many industries and domains.`,
            title: `Performance Test Doc ${docIndex + 1}: ${topic}`,
          });
        }),
      );

      for (const result of batchResults) {
        createdSourceIds.push(result.sourceId);
      }
    }

    expect(createdSourceIds.length).toBe(DOCUMENT_COUNT);

    // Step 2: Measure search latency
    const start = Date.now();
    const searchResult = await search('What are the applications of machine learning?');
    const latencyMs = Date.now() - start;

    // Step 3: Assert results are returned
    expect(searchResult.answer).toBeTruthy();
    expect(searchResult.sources.length).toBeGreaterThan(0);

    // Step 4: Assert latency is within target
    expect(latencyMs).toBeLessThan(SEARCH_LATENCY_TARGET_MS);
  });
});
