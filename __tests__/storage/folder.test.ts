jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    folder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    source: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        folder: {
          delete: jest.fn(),
        },
        source: {
          updateMany: jest.fn(),
        },
      }),
    ),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import prisma from '@/lib/prisma';
import {
  createFolder,
  getFolder,
  listFolders,
  updateFolder,
  deleteFolder,
  moveSourcesToFolder,
} from '@/storage/folder';
import { FolderError } from '@/lib/errors';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseFolder = {
  id: 'folder-1',
  name: 'Research',
  orgId: 'org-1',
  parentId: null,
  isPublic: false,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── createFolder ────────────────────────────────────────────────────────────

describe('createFolder()', () => {
  it('creates a root folder successfully', async () => {
    (mockPrisma.folder.create as jest.Mock).mockResolvedValueOnce(baseFolder);

    const result = await createFolder({
      name: 'Research',
      orgId: 'org-1',
      isPublic: false,
      createdBy: 'user-1',
    });

    expect(result).toEqual(baseFolder);
    expect(mockPrisma.folder.create).toHaveBeenCalledWith({
      data: {
        name: 'Research',
        orgId: 'org-1',
        parentId: null,
        isPublic: false,
        createdBy: 'user-1',
      },
    });
  });

  it('validates parent exists and belongs to same org', async () => {
    const parent = { ...baseFolder, id: 'parent-1', orgId: 'org-1' };
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(parent);
    (mockPrisma.folder.create as jest.Mock).mockResolvedValueOnce({
      ...baseFolder,
      id: 'child-1',
      parentId: 'parent-1',
    });

    const result = await createFolder({
      name: 'Sub',
      orgId: 'org-1',
      parentId: 'parent-1',
      isPublic: false,
      createdBy: 'user-1',
    });

    expect(result.parentId).toBe('parent-1');
  });

  it('throws NOT_FOUND when parent does not exist', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      createFolder({ name: 'Sub', orgId: 'org-1', parentId: 'missing', isPublic: false, createdBy: 'user-1' }),
    ).rejects.toMatchObject({ name: 'FolderError', code: 'NOT_FOUND' });
  });

  it('throws ORG_MISMATCH when parent belongs to different org', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce({
      ...baseFolder,
      orgId: 'org-99',
    });

    await expect(
      createFolder({ name: 'Sub', orgId: 'org-1', parentId: 'folder-1', isPublic: false, createdBy: 'user-1' }),
    ).rejects.toMatchObject({ name: 'FolderError', code: 'ORG_MISMATCH' });
  });

  it('throws INVALID_INPUT for blank name', async () => {
    await expect(
      createFolder({ name: '   ', orgId: 'org-1', isPublic: false, createdBy: 'user-1' }),
    ).rejects.toMatchObject({ name: 'FolderError', code: 'INVALID_INPUT' });

    expect(mockPrisma.folder.create).not.toHaveBeenCalled();
  });
});

// ─── getFolder ───────────────────────────────────────────────────────────────

describe('getFolder()', () => {
  it('returns the folder when found', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(baseFolder);

    const result = await getFolder('folder-1');
    expect(result).toEqual(baseFolder);
    expect(mockPrisma.folder.findUnique).toHaveBeenCalledWith({ where: { id: 'folder-1' } });
  });

  it('returns null when folder does not exist', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const result = await getFolder('missing');
    expect(result).toBeNull();
  });
});

// ─── listFolders ─────────────────────────────────────────────────────────────

describe('listFolders()', () => {
  it('lists root folders when parentId is omitted', async () => {
    (mockPrisma.folder.findMany as jest.Mock).mockResolvedValueOnce([baseFolder]);

    const result = await listFolders('org-1');
    expect(result).toHaveLength(1);
    expect(mockPrisma.folder.findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1', parentId: null },
      orderBy: { name: 'asc' },
    });
  });

  it('lists children when parentId is provided', async () => {
    const child = { ...baseFolder, id: 'child-1', parentId: 'folder-1' };
    (mockPrisma.folder.findMany as jest.Mock).mockResolvedValueOnce([child]);

    const result = await listFolders('org-1', 'folder-1');
    expect(result).toHaveLength(1);
    expect(mockPrisma.folder.findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1', parentId: 'folder-1' },
      orderBy: { name: 'asc' },
    });
  });

  it('returns empty array when no folders found', async () => {
    (mockPrisma.folder.findMany as jest.Mock).mockResolvedValueOnce([]);

    const result = await listFolders('org-empty');
    expect(result).toEqual([]);
  });
});

// ─── updateFolder ─────────────────────────────────────────────────────────────

describe('updateFolder()', () => {
  it('updates name and visibility', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(baseFolder);
    const updated = { ...baseFolder, name: 'Renamed', isPublic: true };
    (mockPrisma.folder.update as jest.Mock).mockResolvedValueOnce(updated);

    const result = await updateFolder('folder-1', { name: 'Renamed', isPublic: true });
    expect(result.name).toBe('Renamed');
    expect(result.isPublic).toBe(true);
  });

  it('throws NOT_FOUND when folder does not exist', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(updateFolder('missing', { name: 'X' })).rejects.toMatchObject({
      name: 'FolderError',
      code: 'NOT_FOUND',
    });
  });

  it('throws INVALID_INPUT for blank name', async () => {
    await expect(updateFolder('folder-1', { name: '  ' })).rejects.toMatchObject({
      name: 'FolderError',
      code: 'INVALID_INPUT',
    });
    expect(mockPrisma.folder.findUnique).not.toHaveBeenCalled();
  });

  it('throws INVALID_INPUT when trying to set self as parent', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(baseFolder);

    await expect(updateFolder('folder-1', { parentId: 'folder-1' })).rejects.toMatchObject({
      name: 'FolderError',
      code: 'INVALID_INPUT',
    });
  });
});

// ─── deleteFolder ─────────────────────────────────────────────────────────────

describe('deleteFolder()', () => {
  it('deletes a leaf folder', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(baseFolder);
    // No children
    (mockPrisma.folder.findMany as jest.Mock).mockResolvedValueOnce([]);

    await deleteFolder('folder-1');

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when folder does not exist', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(deleteFolder('missing')).rejects.toMatchObject({
      name: 'FolderError',
      code: 'NOT_FOUND',
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('collects descendants before deletion', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(baseFolder);
    // folder-1 has one child: child-1
    (mockPrisma.folder.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 'child-1' }]) // children of folder-1
      .mockResolvedValueOnce([]); // children of child-1

    await deleteFolder('folder-1');

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});

// ─── moveSourcesToFolder ──────────────────────────────────────────────────────

describe('moveSourcesToFolder()', () => {
  it('moves sources into the folder', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(baseFolder);

    await moveSourcesToFolder(['src-1', 'src-2'], 'folder-1');

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when target folder does not exist', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(moveSourcesToFolder(['src-1'], 'missing')).rejects.toMatchObject({
      name: 'FolderError',
      code: 'NOT_FOUND',
    });
  });

  it('is a no-op for an empty sourceIds list', async () => {
    await moveSourcesToFolder([], 'folder-1');

    expect(mockPrisma.folder.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
