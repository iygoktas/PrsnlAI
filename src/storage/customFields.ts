// eslint-disable-next-line @typescript-eslint/no-explicit-any
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Field type enum — mirrors the Prisma schema FieldType enum.
 * Defined here as a const so it is available before `prisma generate` is run
 * with the updated schema.
 */
export const FieldType = {
  TEXT:   'TEXT',
  DATE:   'DATE',
  SELECT: 'SELECT',
} as const;

export type FieldType = (typeof FieldType)[keyof typeof FieldType];

// Use `any` for the prisma model until `prisma generate` propagates new types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// ── Exported types ────────────────────────────────────────────────────────────

export interface CustomField {
  id: string;
  orgId: string;
  name: string;
  fieldType: FieldType;
  isRequired: boolean;
  options: unknown;
  createdAt: Date;
}

export interface CreateCustomFieldInput {
  name: string;
  fieldType: FieldType;
  isRequired?: boolean;
  /** Required when fieldType === SELECT; must have at least one option. */
  options?: string[];
}

export interface MetadataValidationError {
  field: string;
  message: string;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Creates a new custom metadata field definition for the organization.
 * SELECT fields must include at least one option.
 */
export async function createCustomField(
  orgId: string,
  input: CreateCustomFieldInput,
): Promise<CustomField> {
  if (!input.name.trim()) {
    throw new Error('Custom field name cannot be empty');
  }
  if (input.fieldType === FieldType.SELECT) {
    if (!input.options || input.options.length === 0) {
      throw new Error('SELECT field must have at least one option');
    }
    const unique = new Set(input.options);
    if (unique.size !== input.options.length) {
      throw new Error('SELECT options must be unique');
    }
  }

  try {
    const field = await db.customField.create({
      data: {
        orgId,
        name: input.name.trim(),
        fieldType: input.fieldType,
        isRequired: input.isRequired ?? false,
        options: input.options ?? null,
      },
    });
    logger.info(`Created custom field "${field.name}" (${field.fieldType}) for org ${orgId}`);
    return field as CustomField;
  } catch (error) {
    logger.error(`Failed to create custom field: ${error}`);
    throw error;
  }
}

/**
 * Returns all custom field definitions for the organization, sorted by name.
 */
export async function listCustomFields(orgId: string): Promise<CustomField[]> {
  try {
    const fields = await db.customField.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    });
    return fields as CustomField[];
  } catch (error) {
    logger.error(`Failed to list custom fields for org ${orgId}: ${error}`);
    throw error;
  }
}

// ── Metadata validation ───────────────────────────────────────────────────────

/**
 * Validates a metadata record against the organization's custom field definitions.
 *
 * Rules per field type:
 *  - TEXT:   any non-empty string
 *  - DATE:   valid ISO 8601 date string (YYYY-MM-DD or full datetime)
 *  - SELECT: value must be one of the field's options
 *
 * @returns Array of validation errors; empty array means valid.
 */
export function validateMetadata(
  metadata: Record<string, unknown>,
  fields: CustomField[],
): MetadataValidationError[] {
  const errors: MetadataValidationError[] = [];
  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  // Check required fields are present
  for (const field of fields) {
    if (field.isRequired && !(field.name in metadata)) {
      errors.push({ field: field.name, message: `"${field.name}" is required` });
    }
  }

  // Validate provided values
  for (const [key, value] of Object.entries(metadata)) {
    const field = fieldMap.get(key);
    if (!field) {
      // Unknown field — open schema, extras are allowed
      continue;
    }

    if (value === null || value === undefined || value === '') {
      if (field.isRequired) {
        errors.push({ field: key, message: `"${key}" is required and cannot be empty` });
      }
      continue;
    }

    const strVal = String(value);

    if (field.fieldType === FieldType.DATE) {
      const d = new Date(strVal);
      if (isNaN(d.getTime())) {
        errors.push({ field: key, message: `"${key}" must be a valid ISO date (got "${strVal}")` });
      }
    } else if (field.fieldType === FieldType.SELECT) {
      const options = (field.options ?? []) as string[];
      if (!options.includes(strVal)) {
        errors.push({
          field: key,
          message: `"${key}" must be one of: ${options.join(', ')} (got "${strVal}")`,
        });
      }
    }
    // TEXT: any string value is valid
  }

  return errors;
}
