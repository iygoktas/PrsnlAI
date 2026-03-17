import { config } from '@/lib/config';
import { EmbeddingError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 100;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Embeds an array of texts using OpenAI's text-embedding-3-small model.
 * Batches requests in groups of 100 and implements exponential backoff for rate limits.
 * @param texts Array of text strings to embed
 * @returns Promise of 2D array of embeddings (each text -> embedding vector)
 */
export async function embedWithOpenAI(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  if (!config.OPENAI_API_KEY) {
    throw new EmbeddingError('OPENAI_API_KEY is not set', 'MISSING_API_KEY');
  }

  const embeddings: number[][] = [];
  const batches = [];

  // Split into batches of 100
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }

  // Process each batch with retries
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: batch,
          }),
        });

        if (response.status === 429) {
          // Rate limit - apply exponential backoff
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          logger.warn(
            `Rate limited on batch ${batchIndex + 1}/${batches.length}, attempt ${attempt + 1}/${MAX_RETRIES}. Backing off ${backoffMs}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new EmbeddingError(
            `OpenAI API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`,
            'API_ERROR',
          );
        }

        const data = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
          throw new EmbeddingError('Invalid OpenAI response format', 'INVALID_RESPONSE');
        }

        // Extract embeddings in order
        const batchEmbeddings = data.data
          .sort((a: any, b: any) => a.index - b.index)
          .map((item: any) => item.embedding);

        embeddings.push(...batchEmbeddings);
        logger.debug(`Embedded batch ${batchIndex + 1}/${batches.length}`);
        break; // Success, move to next batch
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === MAX_RETRIES - 1) {
          throw new EmbeddingError(
            `Failed to embed batch ${batchIndex + 1}/${batches.length} after ${MAX_RETRIES} attempts: ${lastError.message}`,
            'BATCH_FAILED',
          );
        }

        // Non-429 errors should not retry
        if (!(error instanceof EmbeddingError && lastError.message.includes('Rate limited'))) {
          throw lastError;
        }
      }
    }
  }

  if (embeddings.length !== texts.length) {
    throw new EmbeddingError(
      `Embedding count mismatch: expected ${texts.length}, got ${embeddings.length}`,
      'COUNT_MISMATCH',
    );
  }

  return embeddings;
}
