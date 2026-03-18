jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    folder: { findMany: jest.fn(), findUnique: jest.fn() },
    source: { findMany: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import prisma from '@/lib/prisma';
import {
  getAccessibleFolders,
  getAccessibleSources,
  canModifyFolder,
  canSelectForReport,
} from '@/permissions/access';

const mp = prisma as jest.Mocked<typeof prisma>;

// ── fixtures ──────────────────────────────────────────────────────────────────

const adminUser  = { id: 'u-admin',   email: 'admin@co.com',   role: 'ADMIN',   orgId: 'org-1' };
const managerUser= { id: 'u-mgr',     email: 'mgr@co.com',     role: 'MANAGER', orgId: 'org-1' };
const viewerUser = { id: 'u-viewer',  email: 'viewer@co.com',  role: 'VIEWER',  orgId: 'org-1' };

const publicFolder  = { id: 'f-pub',  name: 'Public',  orgId: 'org-1', isPublic: true,  createdBy: 'u-mgr',    parentId: null, createdAt: new Date(), updatedAt: new Date() };
const privateFolder = { id: 'f-priv', name: 'Private', orgId: 'org-1', isPublic: false, createdBy: 'u-mgr',    parentId: null, createdAt: new Date(), updatedAt: new Date() };
const ownFolder     = { id: 'f-own',  name: 'Mine',    orgId: 'org-1', isPublic: false, createdBy: 'u-viewer', parentId: null, createdAt: new Date(), updatedAt: new Date() };

const allFolders = [publicFolder, privateFolder, ownFolder];

const publicSource  = { id: 's-pub',  type: 'TEXT', title: 'Public Doc',  folderId: 'f-pub',  url: null, filePath: null, content: '', createdAt: new Date() };
const privateSource = { id: 's-priv', type: 'TEXT', title: 'Private Doc', folderId: 'f-priv', url: null, filePath: null, content: '', createdAt: new Date() };
const noFolderSource= { id: 's-none', type: 'TEXT', title: 'Orphan Doc',  folderId: null,     url: null, filePath: null, content: '', createdAt: new Date() };

beforeEach(() => jest.clearAllMocks());

// ─── getAccessibleFolders ─────────────────────────────────────────────────────

describe('getAccessibleFolders()', () => {
  it('ADMIN gets all folders', async () => {
    (mp.user.findUnique as jest.Mock).mockResolvedValue(adminUser);
    (mp.folder.findMany as jest.Mock).mockResolvedValue(allFolders);

    const result = await getAccessibleFolders('u-admin', 'org-1');
    expect(result).toHaveLength(3);
  });

  it('MANAGER gets all folders', async () => {
    (mp.user.findUnique as jest.Mock).mockResolvedValue(managerUser);
    (mp.folder.findMany as jest.Mock).mockResolvedValue(allFolders);

    const result = await getAccessibleFolders('u-mgr', 'org-1');
    expect(result).toHaveLength(3);
  });

  it('VIEWER gets only public folders and own folders', async () => {
    (mp.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);
    (mp.folder.findMany as jest.Mock).mockResolvedValue(allFolders);

    const result = await getAccessibleFolders('u-viewer', 'org-1');
    // publicFolder (isPublic) + ownFolder (createdBy viewer)
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toContain('f-pub');
    expect(result.map((f) => f.id)).toContain('f-own');
    expect(result.map((f) => f.id)).not.toContain('f-priv');
  });

  it('VIEWER with no own folders sees only public', async () => {
    (mp.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);
    (mp.folder.findMany as jest.Mock).mockResolvedValue([publicFolder, privateFolder]);

    const result = await getAccessibleFolders('u-viewer', 'org-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('f-pub');
  });
});

// ─── getAccessibleSources ─────────────────────────────────────────────────────

describe('getAccessibleSources()', () => {
  it('ADMIN gets sources from all folders + no-folder sources', async () => {
    (mp.user.findUnique as jest.Mock).mockResolvedValue(adminUser);
    (mp.folder.findMany as jest.Mock).mockResolvedValue(allFolders);
    (mp.source.findMany as jest.Mock).mockResolvedValue([publicSource, privateSource, noFolderSource]);

    const result = await getAccessibleSources('u-admin', 'org-1');
    expect(result).toHaveLength(3);

    // Verify query includes correct folder IDs + null
    const query = (mp.source.findMany as jest.Mock).mock.calls[0][0];
    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ folderId: { in: expect.arrayContaining(['f-pub', 'f-priv', 'f-own']) } }),
        { folderId: null },
      ]),
    );
  });

  it('VIEWER only gets sources from accessible folders + no-folder sources', async () => {
    (mp.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);
    (mp.folder.findMany as jest.Mock).mockResolvedValue(allFolders);
    (mp.source.findMany as jest.Mock).mockResolvedValue([publicSource, noFolderSource]);

    const result = await getAccessibleSources('u-viewer', 'org-1');
    expect(result).toHaveLength(2);

    const query = (mp.source.findMany as jest.Mock).mock.calls[0][0];
    const accessibleIds = query.where.OR[0].folderId.in;
    // f-priv is not accessible to VIEWER (not public, not created by viewer)
    expect(accessibleIds).not.toContain('f-priv');
    expect(accessibleIds).toContain('f-pub');
    expect(accessibleIds).toContain('f-own');
  });
});

// ─── canModifyFolder ──────────────────────────────────────────────────────────

describe('canModifyFolder()', () => {
  it('ADMIN can modify any folder', async () => {
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(privateFolder);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(adminUser);

    expect(await canModifyFolder('u-admin', 'f-priv')).toBe(true);
  });

  it('MANAGER can modify a folder', async () => {
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(privateFolder);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(managerUser);

    expect(await canModifyFolder('u-mgr', 'f-priv')).toBe(true);
  });

  it('VIEWER cannot modify any folder', async () => {
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(publicFolder);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);

    expect(await canModifyFolder('u-viewer', 'f-pub')).toBe(false);
  });

  it('returns false when folder does not exist', async () => {
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(null);

    expect(await canModifyFolder('u-admin', 'missing')).toBe(false);
  });

  it('returns false when user does not belong to the org', async () => {
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(publicFolder);
    (mp.user.findUnique as jest.Mock).mockResolvedValue({ ...adminUser, orgId: 'org-99' });

    expect(await canModifyFolder('u-admin', 'f-pub')).toBe(false);
  });
});

// ─── canSelectForReport ───────────────────────────────────────────────────────

describe('canSelectForReport()', () => {
  it('ADMIN can select any source', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValue(privateSource);
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(privateFolder);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(adminUser);

    expect(await canSelectForReport('u-admin', 's-priv')).toBe(true);
  });

  it('MANAGER can select any source', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValue(privateSource);
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(privateFolder);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(managerUser);

    expect(await canSelectForReport('u-mgr', 's-priv')).toBe(true);
  });

  it('VIEWER can select a source in a public folder', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValue(publicSource);
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(publicFolder);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);

    expect(await canSelectForReport('u-viewer', 's-pub')).toBe(true);
  });

  it('VIEWER cannot select a source in a private folder', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValue(privateSource);
    (mp.folder.findUnique as jest.Mock).mockResolvedValue(privateFolder);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);

    expect(await canSelectForReport('u-viewer', 's-priv')).toBe(false);
  });

  it('any authenticated user can select a source with no folder', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValue(noFolderSource);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(viewerUser);

    expect(await canSelectForReport('u-viewer', 's-none')).toBe(true);
  });

  it('unknown user cannot select a no-folder source', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValue(noFolderSource);
    (mp.user.findUnique as jest.Mock).mockResolvedValue(null);

    expect(await canSelectForReport('u-ghost', 's-none')).toBe(false);
  });

  it('returns false when source does not exist', async () => {
    (mp.source.findUnique as jest.Mock).mockResolvedValue(null);

    expect(await canSelectForReport('u-admin', 'missing')).toBe(false);
  });
});
