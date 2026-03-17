import { extractText, getDocumentProxy } from 'unpdf';
import { IngestionError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Result of PDF ingestion.
 */
export interface PdfIngestionResult {
  title: string;
  content: string;
  type: 'PDF';
  pageCount: number;
}

/**
 * Extracts text from a PDF buffer.
 * Detects scanned PDFs (insufficient text extraction) and throws an error.
 * @param buffer PDF file buffer
 * @param filename Optional filename for title extraction
 * @returns Extracted content with title, type, and page count
 * @throws IngestionError for scanned or corrupt PDFs
 */
export async function ingestPdf(
  buffer: Buffer,
  filename?: string,
): Promise<PdfIngestionResult> {
  if (!buffer || buffer.length === 0) {
    throw new IngestionError('PDF buffer is empty', 'EMPTY_BUFFER');
  }

  let pageCount: number;
  let extractedText: string;

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    pageCount = pdf.numPages;
    const { text } = await extractText(pdf, { mergePages: true });
    extractedText = Array.isArray(text) ? text.join('\n') : text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to parse PDF: ${message}`);
    throw new IngestionError(`Failed to parse PDF: ${message}`, 'CORRUPT_PDF');
  }

  if (!extractedText || !extractedText.trim()) {
    throw new IngestionError('PDF has no extractable text', 'NO_TEXT');
  }

  extractedText = extractedText.trim();

  // Detect scanned PDFs: less than 5% of expected minimum chars
  const expectedMinChars = pageCount * 50;
  if (extractedText.length < expectedMinChars * 0.05) {
    logger.warn(`PDF appears to be scanned (${extractedText.length} chars extracted)`);
    throw new IngestionError(
      'PDF appears to be scanned or contains mostly images. OCR not supported.',
      'SCANNED_PDF',
    );
  }

  // Extract title from filename
  let title = 'Untitled PDF';
  if (filename) {
    title = filename.replace(/\.[^.]+$/, '').substring(0, 50);
  }

  logger.info(`Extracted PDF: "${title}" (${pageCount} pages, ${extractedText.length} chars)`);

  return {
    title,
    content: extractedText,
    type: 'PDF',
    pageCount,
  };
}
