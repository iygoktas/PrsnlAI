export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { ingest } from '@/ingestion/index';
import { IngestionError, AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { parseUserFromRequest, validateRole } from '@/middleware/auth';
import { logAudit } from '@/storage/audit';
import { listCustomFields, validateMetadata } from '@/storage/customFields';
import { updateSourceMetadata } from '@/storage/metadata';

/**
 * Zod schema for validating ingest API requests.
 */
const customMetadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional();

const ingestRequestSchema = z.union([
  z.object({
    type: z.literal('text'),
    content: z.string().min(1, 'Content is required for text ingestion'),
    title: z.string().optional(),
    folderId: z.string().optional(),
    customMetadata: customMetadataSchema,
  }),
  z.object({
    type: z.literal('url'),
    content: z.string().url('Must be a valid URL'),
    title: z.string().optional(),
    folderId: z.string().optional(),
    customMetadata: customMetadataSchema,
  }),
  z.object({
    type: z.literal('pdf'),
    title: z.string().optional(),
    folderId: z.string().optional(),
    customMetadata: customMetadataSchema,
  }),
]);

type IngestRequest = z.infer<typeof ingestRequestSchema>;

/**
 * POST /api/ingest
 *
 * Ingests a document (text, URL, or PDF) into the knowledge base.
 * If the x-user-id header is present, the user must have ADMIN or MANAGER role.
 * Accepts an optional folderId to assign the resulting source to a folder.
 * All ingestion actions are recorded in the audit log when auth is present.
 *
 * @param request Next.js request object
 * @returns JSON response with sourceId, chunksCreated, title, processingTimeMs
 */
export async function POST(request: NextRequest) {
  try {
    // ── Optional auth: ADMIN / MANAGER only ──────────────────────────────────
    let authContext: Awaited<ReturnType<typeof parseUserFromRequest>> | null = null;

    if (request.headers.get('x-user-id')) {
      try {
        authContext = await parseUserFromRequest(request);
      } catch (authErr) {
        if (authErr instanceof AuthError) {
          logger.warn(`Ingest auth failed: ${authErr.message}`);
          return NextResponse.json(
            { error: authErr.message, code: authErr.code },
            { status: 401 },
          );
        }
        throw authErr;
      }

      if (!validateRole(authContext.role, ['ADMIN', 'MANAGER'])) {
        logger.warn(
          `Ingest forbidden: user ${authContext.userId} has role ${authContext.role}`,
        );
        await logAudit(authContext.userId, authContext.orgId, 'INGEST_FORBIDDEN', undefined, {
          role: authContext.role,
        });
        return NextResponse.json(
          { error: 'Forbidden: ADMIN or MANAGER role required' },
          { status: 403 },
        );
      }
    }

    // ── Parse request body ────────────────────────────────────────────────────
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
        const folderId = formData.get('folderId')?.toString();

        // Use original filename (stripped of extension) if no explicit title
        const inferredTitle = title || (pdfFile.name
          ? pdfFile.name.replace(/\.[^.]+$/, '')
          : undefined);

        body = { type, content, title: inferredTitle, folderId };
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

    // ── Validate with Zod ─────────────────────────────────────────────────────
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

    // ── Build ingestion input ─────────────────────────────────────────────────
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

    // ── Call ingestion pipeline ───────────────────────────────────────────────
    const result = await ingest(ingestionInput);

    logger.info(
      `Ingestion successful: sourceId=${result.sourceId}, chunks=${result.chunksCreated}`,
    );

    // ── Validate and store customMetadata ────────────────────────────────────
    if (validatedData.customMetadata && Object.keys(validatedData.customMetadata).length > 0) {
      try {
        // When auth is present, validate against org's custom field definitions
        if (authContext) {
          const fieldDefs = await listCustomFields(authContext.orgId);
          const errs = validateMetadata(
            validatedData.customMetadata as Record<string, unknown>,
            fieldDefs,
          );
          if (errs.length > 0) {
            return NextResponse.json(
              { error: 'Custom metadata validation failed', details: errs },
              { status: 422 },
            );
          }
        }
        await updateSourceMetadata(
          result.sourceId,
          validatedData.customMetadata as Record<string, unknown>,
        );
        logger.info(`Stored custom metadata for source ${result.sourceId}`);
      } catch (err) {
        logger.warn(`Failed to store custom metadata: ${err}`);
      }
    }

    // ── Assign to folder if provided ──────────────────────────────────────────
    if (validatedData.folderId) {
      try {
        await prisma.source.update({
          where: { id: result.sourceId },
          data: { folderId: validatedData.folderId },
        });
        logger.info(`Assigned source ${result.sourceId} to folder ${validatedData.folderId}`);
      } catch (err) {
        // Non-fatal: source was ingested, just not assigned to the folder
        logger.warn(`Failed to assign source to folder: ${err}`);
      }
    }

    // ── Persist the original PDF file for preview ─────────────────────────────
    if (validatedData.type === 'pdf' && fileBuffer) {
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, `${result.sourceId}.pdf`);
        await fs.writeFile(filePath, fileBuffer);
        await prisma.source.update({
          where: { id: result.sourceId },
          data: { filePath },
        });
        logger.info(`Saved PDF to ${filePath}`);
      } catch (err) {
        // Non-fatal: ingestion succeeded, file preview just won't be available
        logger.warn(`Failed to persist PDF file: ${err}`);
      }
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    if (authContext) {
      await logAudit(
        authContext.userId,
        authContext.orgId,
        'UPLOAD',
        { id: result.sourceId, type: 'SOURCE' },
        {
          contentType: validatedData.type,
          chunksCreated: result.chunksCreated,
          folderId: validatedData.folderId ?? null,
        },
      );
    }

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
