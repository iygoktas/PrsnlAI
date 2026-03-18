jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    customField: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    source: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import prisma from '@/lib/prisma';
import {
  createCustomField,
  listCustomFields,
  validateMetadata,
  FieldType,
} from '@/storage/customFields';
import {
  updateSourceMetadata,
  getSourceMetadata,
} from '@/storage/metadata';

const mp = prisma as jest.Mocked<typeof prisma>;

const textField = {
  id: 'cf-text',
  orgId: 'org-1',
  name: 'Project ID',
  fieldType: FieldType.TEXT,
  isRequired: false,
  options: null,
  createdAt: new Date(),
};

const dateField = {
  id: 'cf-date',
  orgId: 'org-1',
  name: 'Deadline',
  fieldType: FieldType.DATE,
  isRequired: true,
  options: null,
  createdAt: new Date(),
};

const selectField = {
  id: 'cf-select',
  orgId: 'org-1',
  name: 'Department',
  fieldType: FieldType.SELECT,
  isRequired: false,
  options: ['Engineering', 'Marketing', 'Legal'],
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ─── createCustomField ────────────────────────────────────────────────────────

describe('createCustomField()', () => {
  it('creates a TEXT field', async () => {
    (mp.customField.create as jest.Mock).mockResolvedValueOnce(textField);

    const result = await createCustomField('org-1', {
      name: 'Project ID',
      fieldType: FieldType.TEXT,
    });

    expect(result).toEqual(textField);
    expect(mp.customField.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org-1',
        name: 'Project ID',
        fieldType: FieldType.TEXT,
        isRequired: false,
        options: null,
      },
    });
  });

  it('creates a DATE field with isRequired=true', async () => {
    (mp.customField.create as jest.Mock).mockResolvedValueOnce(dateField);

    const result = await createCustomField('org-1', {
      name: 'Deadline',
      fieldType: FieldType.DATE,
      isRequired: true,
    });

    expect(result.isRequired).toBe(true);
    expect(mp.customField.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isRequired: true }) }),
    );
  });

  it('creates a SELECT field with options', async () => {
    (mp.customField.create as jest.Mock).mockResolvedValueOnce(selectField);

    const result = await createCustomField('org-1', {
      name: 'Department',
      fieldType: FieldType.SELECT,
      options: ['Engineering', 'Marketing', 'Legal'],
    });

    expect(result.options).toEqual(['Engineering', 'Marketing', 'Legal']);
    expect(mp.customField.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ options: ['Engineering', 'Marketing', 'Legal'] }),
      }),
    );
  });

  it('throws when SELECT field has no options', async () => {
    await expect(
      createCustomField('org-1', { name: 'Status', fieldType: FieldType.SELECT }),
    ).rejects.toThrow('SELECT field must have at least one option');

    expect(mp.customField.create).not.toHaveBeenCalled();
  });

  it('throws when SELECT options are not unique', async () => {
    await expect(
      createCustomField('org-1', {
        name: 'Priority',
        fieldType: FieldType.SELECT,
        options: ['High', 'High', 'Low'],
      }),
    ).rejects.toThrow('SELECT options must be unique');
  });

  it('throws for blank name', async () => {
    await expect(
      createCustomField('org-1', { name: '  ', fieldType: FieldType.TEXT }),
    ).rejects.toThrow('cannot be empty');
  });
});

// ─── listCustomFields ─────────────────────────────────────────────────────────

describe('listCustomFields()', () => {
  it('returns all fields for the org', async () => {
    (mp.customField.findMany as jest.Mock).mockResolvedValueOnce([textField, selectField]);

    const result = await listCustomFields('org-1');
    expect(result).toHaveLength(2);
    expect(mp.customField.findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1' },
      orderBy: { name: 'asc' },
    });
  });

  it('returns empty array when org has no fields', async () => {
    (mp.customField.findMany as jest.Mock).mockResolvedValueOnce([]);
    expect(await listCustomFields('org-empty')).toEqual([]);
  });
});

// ─── validateMetadata ─────────────────────────────────────────────────────────

describe('validateMetadata()', () => {
  const fields = [textField, dateField, selectField];

  it('returns no errors for valid metadata', () => {
    const errors = validateMetadata(
      { 'Project ID': 'ACME-42', 'Deadline': '2024-06-01', 'Department': 'Engineering' },
      fields,
    );
    expect(errors).toHaveLength(0);
  });

  it('reports missing required field', () => {
    const errors = validateMetadata({ 'Project ID': 'ACME' }, fields);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'Deadline' }),
    );
  });

  it('reports invalid DATE value', () => {
    const errors = validateMetadata({ 'Deadline': 'not-a-date' }, fields);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'Deadline', message: expect.stringContaining('valid ISO date') }),
    );
  });

  it('reports invalid SELECT value', () => {
    const errors = validateMetadata({ 'Deadline': '2024-01-01', 'Department': 'Finance' }, fields);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: 'Department',
        message: expect.stringContaining('Engineering, Marketing, Legal'),
      }),
    );
  });

  it('accepts valid ISO datetime for DATE field', () => {
    const errors = validateMetadata({ 'Deadline': '2024-06-01T00:00:00.000Z' }, [dateField]);
    expect(errors).toHaveLength(0);
  });

  it('allows unknown extra keys (open schema)', () => {
    const errors = validateMetadata({ 'Deadline': '2024-01-01', 'Extra': 'value' }, fields);
    // Only missing required fields trigger errors for knowns
    expect(errors.some((e) => e.field === 'Extra')).toBe(false);
  });

  it('reports empty value for required TEXT field', () => {
    const requiredText = { ...textField, isRequired: true };
    const errors = validateMetadata({ 'Project ID': '' }, [requiredText]);
    expect(errors).toContainEqual(expect.objectContaining({ field: 'Project ID' }));
  });
});

// ─── updateSourceMetadata / getSourceMetadata ──────────────────────────────────

describe('updateSourceMetadata()', () => {
  it('merges new metadata with existing', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'src-1',
      customMetadata: { 'Project ID': 'OLD' },
    });
    (mp.source.update as jest.Mock).mockResolvedValueOnce({
      id: 'src-1',
      customMetadata: { 'Project ID': 'NEW', 'Deadline': '2024-01-01' },
    });

    const result = await updateSourceMetadata('src-1', {
      'Project ID': 'NEW',
      'Deadline': '2024-01-01',
    });

    expect(mp.source.update).toHaveBeenCalledWith({
      where: { id: 'src-1' },
      data: {
        customMetadata: { 'Project ID': 'NEW', 'Deadline': '2024-01-01' },
      },
    });
    expect(result.customMetadata).toMatchObject({ 'Project ID': 'NEW' });
  });

  it('throws when source does not exist', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      updateSourceMetadata('missing', { key: 'value' }),
    ).rejects.toThrow('Source missing not found');
  });
});

describe('getSourceMetadata()', () => {
  it('returns the customMetadata object', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValueOnce({
      customMetadata: { 'Project ID': 'ACME' },
    });

    const result = await getSourceMetadata('src-1');
    expect(result).toEqual({ 'Project ID': 'ACME' });
    expect(mp.source.findUnique).toHaveBeenCalledWith({
      where: { id: 'src-1' },
      select: { customMetadata: true },
    });
  });

  it('returns {} when customMetadata is null', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValueOnce({ customMetadata: null });

    const result = await getSourceMetadata('src-1');
    expect(result).toEqual({});
  });

  it('throws when source does not exist', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(getSourceMetadata('missing')).rejects.toThrow('Source missing not found');
  });
});
