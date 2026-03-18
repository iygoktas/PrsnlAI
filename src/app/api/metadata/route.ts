export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldType } from '@prisma/client';
import { createCustomField, listCustomFields } from '@/storage/customFields';
import { parseUserFromRequest, validateRole } from '@/middleware/auth';
import { logAudit } from '@/storage/audit';
import { AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const createFieldSchema = z.object({
  name: z.string().min(1, 'name is required'),
  fieldType: z.nativeEnum(FieldType),
  isRequired: z.boolean().optional(),
  options: z.array(z.string().min(1)).optional(),
});

/**
 * GET /api/metadata?orgId=<orgId>
 *
 * Returns all custom field definitions for the organization.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ error: 'orgId query parameter is required' }, { status: 400 });
    }

    const fields = await listCustomFields(orgId);
    return NextResponse.json({
      fields: fields.map((f) => ({
        id: f.id,
        name: f.name,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        options: f.options ?? null,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    logger.error(`GET /api/metadata error: ${error}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/metadata
 *
 * Creates a new custom field definition. Requires ADMIN role.
 * Body: { name, fieldType, isRequired?, options? }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth — ADMIN only
    let authContext: Awaited<ReturnType<typeof parseUserFromRequest>>;
    try {
      authContext = await parseUserFromRequest(request);
    } catch (authErr) {
      if (authErr instanceof AuthError) {
        return NextResponse.json({ error: authErr.message, code: authErr.code }, { status: 401 });
      }
      throw authErr;
    }

    if (!validateRole(authContext.role, ['ADMIN'])) {
      logger.warn(`POST /api/metadata forbidden: user ${authContext.userId} role=${authContext.role}`);
      await logAudit(authContext.userId, authContext.orgId, 'METADATA_CREATE_FORBIDDEN', undefined, {
        role: authContext.role,
      });
      return NextResponse.json({ error: 'Forbidden: ADMIN role required' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const validation = createFieldSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const data = validation.data;
    const field = await createCustomField(authContext.orgId, {
      name: data.name,
      fieldType: data.fieldType,
      isRequired: data.isRequired,
      options: data.options,
    });

    await logAudit(authContext.userId, authContext.orgId, 'METADATA_CREATE', undefined, {
      fieldId: field.id,
      fieldName: field.name,
      fieldType: field.fieldType,
    });

    logger.info(`POST /api/metadata: created field "${field.name}" for org ${authContext.orgId}`);

    return NextResponse.json(
      {
        id: field.id,
        name: field.name,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        options: field.options ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error(`POST /api/metadata error: ${error}`);

    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return NextResponse.json(
        { error: 'A custom field with that name already exists in this organization' },
        { status: 409 },
      );
    }
    if (msg.includes('SELECT field') || msg.includes('cannot be empty') || msg.includes('unique')) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
