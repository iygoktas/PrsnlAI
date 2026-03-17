/**
 * @jest-environment node
 */

/**
 * T-036: E2E — add a URL → search for content → verify source appears in top 3
 *
 * Requires: DATABASE_URL, DIRECT_URL, OPENAI_API_KEY (or OLLAMA), ANTHROPIC_API_KEY (or OLLAMA)
 * Skip: automatically when env vars are missing.
 */

import { ingest } from '@/ingestion/index';
import { search } from '@/search/index';
import { deleteSource } from '@/storage/metadata';

const REQUIRED_VARS = ['DATABASE_URL', 'DIRECT_URL'];
const hasEnv = REQUIRED_VARS.every((v) => !!process.env[v]);

const describeIf = hasEnv ? describe : describe.skip;

describeIf('E2E: URL ingestion + search', () => {
  jest.setTimeout(60_000);

  let createdSourceId: string | null = null;

  afterEach(async () => {
    if (createdSourceId) {
      try {
        await deleteSource(createdSourceId);
      } catch {
        // best-effort cleanup
      }
      createdSourceId = null;
    }
  });

  it('should ingest a URL and find the source in search results', async () => {
    // Step 1: Ingest https://example.com (used in ARCHITECTURE.md integration test)
    const ingestResult = await ingest({
      type: 'url',
      url: 'https://example.com',
      title: 'Example Domain E2E Test',
    });

    expect(ingestResult.sourceId).toBeTruthy();
    expect(ingestResult.chunksCreated).toBeGreaterThan(0);
    expect(ingestResult.title).toBe('Example Domain E2E Test');
    createdSourceId = ingestResult.sourceId;

    // Step 2: Search for content from that URL
    const searchResult = await search('What is Example Domain used for?');

    expect(searchResult.answer).toBeTruthy();
    expect(searchResult.sources.length).toBeGreaterThan(0);

    // Step 3: The ingested source must appear in the top 3 results
    const top3Ids = searchResult.sources.slice(0, 3).map((s) => s.sourceId);
    expect(top3Ids).toContain(ingestResult.sourceId);
  });
});
