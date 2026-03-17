/**
 * @jest-environment node
 */

/**
 * T-037: E2E — upload a PDF → search for content → verify source appears in results
 *
 * Note: per-chunk page number tracking is not yet propagated through the ingestion
 * pipeline (ingest/index.ts passes no pageNumber to chunks), so this test verifies
 * the PDF is ingested and searchable rather than checking page numbers.
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

/**
 * Builds a minimal valid PDF buffer with the given body text.
 * Calculates xref byte offsets automatically.
 */
function buildMinimalPdf(bodyText: string): Buffer {
  // Escape PDF string special characters
  const escaped = bodyText.replace(/[()\\]/g, '\\$&');
  const streamContent = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;

  const objects: string[] = [];
  objects.push('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n');
  objects.push('2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n');
  objects.push(
    '3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
      '/Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>\nendobj\n',
  );
  objects.push(
    `4 0 obj\n<</Length ${streamContent.length}>>\nstream\n${streamContent}\nendstream\nendobj\n`,
  );
  objects.push(
    '5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n',
  );

  const header = '%PDF-1.4\n';
  const offsets: number[] = [0]; // offset[0] is the free entry
  let body = header;

  for (const obj of objects) {
    offsets.push(body.length);
    body += obj + '\n';
  }

  const xrefPos = body.length;
  let xref = 'xref\n';
  xref += `0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer);
}

describeIf('E2E: PDF ingestion + search', () => {
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

  it('should ingest a PDF and find the source in search results', async () => {
    // Build a minimal PDF with unique, searchable content
    const pdfText =
      'Quantum computing uses qubits to perform computations. ' +
      'Unlike classical bits that are either 0 or 1, qubits can exist in superposition. ' +
      'This allows quantum computers to solve certain problems exponentially faster. ' +
      'Grover algorithm and Shor algorithm are two well-known quantum algorithms. ' +
      'Quantum entanglement enables quantum teleportation of information states. ' +
      'Decoherence is the main challenge in building stable quantum computers today.';

    const pdfBuffer = buildMinimalPdf(pdfText);

    // Step 1: Ingest the PDF
    const ingestResult = await ingest({
      type: 'pdf',
      file: pdfBuffer,
      title: 'Quantum Computing E2E Test',
    });

    expect(ingestResult.sourceId).toBeTruthy();
    expect(ingestResult.chunksCreated).toBeGreaterThan(0);
    createdSourceId = ingestResult.sourceId;

    // Step 2: Search for content from the PDF
    const searchResult = await search('What are qubits in quantum computing?');

    expect(searchResult.answer).toBeTruthy();
    expect(searchResult.sources.length).toBeGreaterThan(0);

    // Step 3: The ingested source appears in results
    const sourceIds = searchResult.sources.map((s) => s.sourceId);
    expect(sourceIds).toContain(ingestResult.sourceId);
  });
});
