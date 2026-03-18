jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    folder: {
      findUnique: jest.fn(),
    },
    source: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import prisma from '@/lib/prisma';
import { getUserRole, canViewFolder, canSelectForReport } from '@/storage/permissions';
import { FolderError } from '@/lib/errors';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const adminUser = { id: 'user-admin', email: 'admin@example.com', role: 'ADMIN', orgId: 'org-1' };
const managerUser = { id: 'user-mgr', email: 'mgr@example.com', role: 'MANAGER', orgId: 'org-1' };
const viewerUser = { id: 'user-viewer', email: 'viewer@example.com', role: 'VIEWER', orgId: 'org-1' };

const publicFolder = {
  id: 'folder-pub',
  name: 'Public Docs',
  orgId: 'org-1',
  parentId: null,
  isPublic: true,
  createdBy: 'user-mgr',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const privateFolder = {
  ...publicFolder,
  id: 'folder-priv',
  name: 'Private Docs',
  isPublic: false,
  createdBy: 'user-mgr',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getUserRole ──────────────────────────────────────────────────────────────

describe('getUserRole()', () => {
  it('returns ADMIN for an admin user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(adminUser);

    const role = await getUserRole('user-admin', 'org-1');
    expect(role).toBe('ADMIN');
  });

  it('returns MANAGER for a manager user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(managerUser);

    const role = await getUserRole('user-mgr', 'org-1');
    expect(role).toBe('MANAGER');
  });

  it('returns VIEWER for a viewer user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(viewerUser);

    const role = await getUserRole('user-viewer', 'org-1');
    expect(role).toBe('VIEWER');
  });

  it('throws NOT_FOUND when user does not exist', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(getUserRole('unknown', 'org-1')).rejects.toMatchObject({
      name: 'FolderError',
      code: 'NOT_FOUND',
    });
  });

  it('throws UNAUTHORIZED when user belongs to a different org', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...adminUser,
      orgId: 'org-99',
    });

    await expect(getUserRole('user-admin', 'org-1')).rejects.toMatchObject({
      name: 'FolderError',
      code: 'UNAUTHORIZED',
    });
  });
});

// ─── canViewFolder ────────────────────────────────────────────────────────────

describe('canViewFolder()', () => {
  it('returns false when folder does not exist', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const result = await canViewFolder('user-admin', 'missing');
    expect(result).toBe(false);
  });

  it('returns false when user does not belong to the org', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(publicFolder);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...adminUser,
      orgId: 'org-99',
    });

    const result = await canViewFolder('user-admin', 'folder-pub');
    expect(result).toBe(false);
  });

  it('ADMIN can view any folder in their org', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(privateFolder);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(adminUser);

    const result = await canViewFolder('user-admin', 'folder-priv');
    expect(result).toBe(true);
  });

  it('MANAGER can view a public folder', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(publicFolder);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(managerUser);

    const result = await canViewFolder('user-mgr', 'folder-pub');
    expect(result).toBe(true);
  });

  it('MANAGER can view a private folder they created', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(privateFolder); // createdBy: user-mgr
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(managerUser);

    const result = await canViewFolder('user-mgr', 'folder-priv');
    expect(result).toBe(true);
  });

  it('MANAGER cannot view a private folder created by someone else', async () => {
    const otherPrivate = { ...privateFolder, createdBy: 'user-other' };
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(otherPrivate);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(managerUser);

    const result = await canViewFolder('user-mgr', 'folder-priv');
    expect(result).toBe(false);
  });

  it('VIEWER can view a public folder', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(publicFolder);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(viewerUser);

    const result = await canViewFolder('user-viewer', 'folder-pub');
    expect(result).toBe(true);
  });

  it('VIEWER cannot view a private folder', async () => {
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(privateFolder);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(viewerUser);

    const result = await canViewFolder('user-viewer', 'folder-priv');
    expect(result).toBe(false);
  });
});

// ─── canSelectForReport ───────────────────────────────────────────────────────

describe('canSelectForReport()', () => {
  it('returns false when source does not exist', async () => {
    (mockPrisma.source.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const result = await canSelectForReport('user-admin', 'missing-src');
    expect(result).toBe(false);
  });

  it('allows any existing user to select a source without a folder', async () => {
    (mockPrisma.source.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'src-1',
      folderId: null,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(viewerUser);

    const result = await canSelectForReport('user-viewer', 'src-1');
    expect(result).toBe(true);
  });

  it('blocks unknown user from selecting a source without a folder', async () => {
    (mockPrisma.source.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'src-1',
      folderId: null,
    });
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const result = await canSelectForReport('unknown-user', 'src-1');
    expect(result).toBe(false);
  });

  it('delegates to canViewFolder for sources in a folder — allowed', async () => {
    (mockPrisma.source.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'src-2',
      folderId: 'folder-pub',
    });
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(publicFolder);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(viewerUser);

    const result = await canSelectForReport('user-viewer', 'src-2');
    expect(result).toBe(true);
  });

  it('delegates to canViewFolder for sources in a folder — denied', async () => {
    (mockPrisma.source.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'src-3',
      folderId: 'folder-priv',
    });
    (mockPrisma.folder.findUnique as jest.Mock).mockResolvedValueOnce(privateFolder);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(viewerUser);

    const result = await canSelectForReport('user-viewer', 'src-3');
    expect(result).toBe(false);
  });
});
