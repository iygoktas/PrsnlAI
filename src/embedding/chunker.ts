import { config } from '@/lib/config';

export interface Chunk {
  content: string;
  chunkIndex: number;
  tokenEstimate: number;
}

/**
 * Splits text into overlapping chunks based on token count.
 * Uses a rough token estimation of 4 characters per token.
 * @param text The text to chunk
 * @returns Array of chunks with content, index, and token estimate
 */
export function chunk(text: string): Chunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunkSize = config.MAX_CHUNK_SIZE;
  const chunkOverlap = config.CHUNK_OVERLAP;
  const charsPerToken = 4; // rough approximation

  // Convert token counts to character counts
  const chunkCharSize = chunkSize * charsPerToken;
  const overlapCharSize = chunkOverlap * charsPerToken;
  const stepSize = chunkCharSize - overlapCharSize;

  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Calculate chunk boundaries
    const chunkEnd = Math.min(currentIndex + chunkCharSize, text.length);
    let chunkContent = text.slice(currentIndex, chunkEnd);

    // Try to break at a word boundary if not at the end
    if (chunkEnd < text.length && chunkContent.length > chunkCharSize * 0.8) {
      const lastSpaceIndex = chunkContent.lastIndexOf(' ');
      if (lastSpaceIndex > 0) {
        chunkContent = chunkContent.slice(0, lastSpaceIndex);
      }
    }

    const trimmedContent = chunkContent.trim();
    if (trimmedContent.length > 0) {
      // Calculate token estimate
      const tokenEstimate = Math.ceil(trimmedContent.length / charsPerToken);

      chunks.push({
        content: trimmedContent,
        chunkIndex,
        tokenEstimate,
      });

      chunkIndex++;
    }

    // Move forward for next chunk (with overlap)
    currentIndex += stepSize;

    // Prevent infinite loop on very short text
    if (stepSize === 0 || currentIndex >= text.length) {
      break;
    }
  }

  return chunks;
}
