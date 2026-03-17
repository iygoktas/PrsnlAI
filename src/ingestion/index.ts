import { ingestText } from '@/ingestion/text';
import { ingestPdf } from '@/ingestion/pdf';
import { ingestUrl } from '@/ingestion/url';
import { chunk } from '@/embedding/chunker';
import { embed } from '@/embedding/index';
import { saveDocument } from '@/storage/index';
import { IngestionError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { CreateSourceInput } from '@/storage/metadata';

/**
 * Input to the ingestion pipeline.
 */
export interface IngestionInput {
  type: 'url' | 'pdf' | 'text';
  content?: string; // For text/markdown
  url?: string; // For URL
  file?: Buffer; // For PDF
  title?: string; // Optional title override
}

/**
 * Result of the complete ingestion pipeline.
 */
export interface IngestionResult {
  sourceId: string;
  chunksCreated: number;
  title: string;
  processingTimeMs: number;
}

/**
 * Orchestrates the complete ingestion pipeline: parse → chunk → embed → save.
 * Routes to appropriate parser based on input type, then chunks, embeds, and stores.
 * @param input Ingestion input with type and content
 * @returns Source ID and processing metadata
 * @throws IngestionError on parse, embedding, or storage failures
 */
export async function ingest(input: IngestionInput): Promise<IngestionResult> {
  const startTime = Date.now();

  if (!input || !input.type) {
    throw new IngestionError('Invalid ingestion input', 'INVALID_INPUT');
  }

  let parseResult;

  try {
    // Route to appropriate parser
    if (input.type === 'url') {
      if (!input.url) {
        throw new IngestionError('URL input requires url field', 'MISSING_URL');
      }
      parseResult = await ingestUrl(input.url);
    } else if (input.type === 'pdf') {
      if (!input.file) {
        throw new IngestionError('PDF input requires file buffer', 'MISSING_FILE');
      }
      parseResult = await ingestPdf(input.file, input.title);
    } else if (input.type === 'text') {
      if (!input.content && input.content !== '') {
        throw new IngestionError('Text input requires content field', 'MISSING_CONTENT');
      }
      parseResult = ingestText(input.content || '');
    } else {
      throw new IngestionError(`Unknown ingestion type: ${input.type}`, 'UNKNOWN_TYPE');
    }
  } catch (error) {
    if (error instanceof IngestionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new IngestionError(`Parse failed: ${message}`, 'PARSE_ERROR');
  }

  // Override title if provided
  const title = input.title || parseResult.title;

  // Chunk the content
  const chunks = chunk(parseResult.content);

  if (chunks.length === 0) {
    throw new IngestionError('No chunks generated from content', 'NO_CHUNKS');
  }

  // Generate embeddings
  let embeddings: number[][];
  try {
    const texts = chunks.map((c) => c.content);
    embeddings = await embed(texts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new IngestionError(`Embedding failed: ${message}`, 'EMBEDDING_FAILED');
  }

  // Prepare source metadata
  const sourceInput: CreateSourceInput = {
    type: input.type.toUpperCase() as any,
    title,
    content: parseResult.content,
    ...(input.type === 'url' && { url: (parseResult as any).url }),
  };

  // Save document with chunks and embeddings
  let sourceId: string;
  try {
    sourceId = await saveDocument(
      sourceInput,
      chunks.map((c) => ({
        content: c.content,
        chunkIndex: c.chunkIndex,
      })),
      embeddings,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new IngestionError(`Storage failed: ${message}`, 'STORAGE_FAILED');
  }

  const processingTimeMs = Date.now() - startTime;
  logger.info(
    `Ingestion complete: ${input.type} → ${chunks.length} chunks → sourceId ${sourceId} (${processingTimeMs}ms)`,
  );

  return {
    sourceId,
    chunksCreated: chunks.length,
    title,
    processingTimeMs,
  };
}
