export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ingest } from '@/ingestion/index';
import { IngestionError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Zod schema for validating ingest API requests.
 */
const ingestRequestSchema = z.union([
  z.object({
    type: z.literal('text'),
    content: z.string().min(1, 'Content is required for text ingestion'),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('url'),
    content: z.string().url('Must be a valid URL'),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('pdf'),
    title: z.string().optional(),
  }),
]);

type IngestRequest = z.infer<typeof ingestRequestSchema>;

/**
 * POST /api/ingest
 *
 * Ingests a document (text, URL, or PDF) into the knowledge base.
 * Validates input, calls the ingestion pipeline, and returns processing results.
 *
 * @param request Next.js request object
 * @returns JSON response with sourceId, chunksCreated, title, processingTimeMs
 */
export async function POST(request: NextRequest) {
  try {
    // Check content type to determine if it's multipart (PDF) or JSON
    const contentType = request.headers.get('content-type');
    let body: unknown;
    let fileBuffer: Buffer | undefined;

    if (contentType?.includes('multipart/form-data')) {
      // Handle multipart form data for PDF uploads
      try {
        const formData = await request.formData();
        const pdfFile = formData.get('file');

        if (!pdfFile || !(pdfFile instanceof File)) {
          logger.warn('PDF ingestion requires a file');
          return NextResponse.json(
            { error: 'PDF ingestion requires a file field' },
            { status: 400 },
          );
        }

        fileBuffer = Buffer.from(await pdfFile.arrayBuffer());

        // Extract other form fields
        const type = formData.get('type')?.toString();
        const content = formData.get('content')?.toString();
        const title = formData.get('title')?.toString();

        body = { type, content, title };
      } catch (error) {
        logger.warn(`FormData parsing error: ${error}`);
        return NextResponse.json(
          { error: 'Invalid multipart form data' },
          { status: 400 },
        );
      }
    } else {
      // Parse JSON request body
      try {
        body = await request.json();
      } catch {
        logger.warn('Invalid JSON in ingest request');
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 },
        );
      }
    }

    // Validate request with Zod
    const validation = ingestRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      logger.warn(`Ingest validation failed: ${JSON.stringify(errors)}`);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 },
      );
    }

    const validatedData = validation.data as IngestRequest;
    logger.debug(`Ingest request validated: type=${validatedData.type}`);

    // Build ingestion input
    let ingestionInput: Parameters<typeof ingest>[0];
    if (validatedData.type === 'text') {
      ingestionInput = {
        type: 'text',
        content: validatedData.content,
        title: validatedData.title,
      };
    } else if (validatedData.type === 'url') {
      ingestionInput = {
        type: 'url',
        url: validatedData.content, // URL string (validated as valid URL by Zod)
        title: validatedData.title,
      };
    } else {
      // PDF
      ingestionInput = {
        type: 'pdf',
        file: fileBuffer!,
        title: validatedData.title,
      };
    }

    logger.info(`Starting ingestion: ${validatedData.type}`);

    // Call ingestion pipeline
    const result = await ingest(ingestionInput);

    logger.info(
      `Ingestion successful: sourceId=${result.sourceId}, chunks=${result.chunksCreated}`,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error(`Ingest endpoint error: ${error}`);

    // Map specific error codes to HTTP status codes
    if (error instanceof IngestionError) {
      const parseErrors = [
        'PARSE_ERROR',
        'NO_CHUNKS',
        'MISSING_URL',
        'MISSING_FILE',
        'MISSING_CONTENT',
        'INVALID_INPUT',
        'UNKNOWN_TYPE',
        'INVALID_URL',
        'INSUFFICIENT_CONTENT',
        'NO_CONTENT',
        'TIMEOUT',
        'NETWORK_ERROR',
      ];

      const serverErrors = ['EMBEDDING_FAILED', 'STORAGE_FAILED'];

      // 422 for parse/content errors
      if (parseErrors.includes(error.code)) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 422 },
        );
      }

      // 500 for embedding and storage failures
      if (serverErrors.includes(error.code)) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 500 },
        );
      }

      // For any other IngestionError, return with code
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 },
      );
    }

    // Default to 500 for unexpected errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
