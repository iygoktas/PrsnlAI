import pdfParse from 'pdf-parse';
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

  let pdf;
  try {
    // Parse PDF and extract text
    pdf = await pdfParse(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to parse PDF: ${message}`);
    throw new IngestionError(`Failed to parse PDF: ${message}`, 'CORRUPT_PDF');
  }

  // Check if PDF has content
  if (!pdf || !pdf.text) {
    throw new IngestionError('PDF has no extractable text', 'NO_TEXT');
  }

  const extractedText = pdf.text.trim();
  const pageCount = pdf.numpages || 1;

  // Detect scanned PDFs: if very little text was extracted relative to page count
  const expectedMinChars = pageCount * 50; // Rough estimate: 50 chars per page minimum
  if (extractedText.length < expectedMinChars * 0.05) {
    // Less than 5% of expected text
    logger.warn(`PDF appears to be scanned (${extractedText.length} chars extracted)`);
    throw new IngestionError(
      'PDF appears to be scanned or contains mostly images. OCR not supported.',
      'SCANNED_PDF',
    );
  }

  // Extract title from metadata or filename
  let title = 'Untitled PDF';
  if (pdf.info?.Title && typeof pdf.info.Title === 'string' && pdf.info.Title.length > 0) {
    title = pdf.info.Title.substring(0, 50);
  } else if (filename) {
    // Extract filename without extension
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
