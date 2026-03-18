import { Folder, Source } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getUserRole } from '@/storage/permissions';
import type { Role } from '@/storage/permissions';

/**
 * Returns all folders the user is permitted to view within the organization.
 *
 * - ADMIN / MANAGER: all folders in the org
 * - VIEWER: only public folders + folders the user created themselves
 */
export async function getAccessibleFolders(userId: string, orgId: string): Promise<Folder[]> {
  const role = await getUserRole(userId, orgId);

  const allFolders = await prisma.folder.findMany({ where: { orgId } });

  if (role === 'ADMIN' || role === 'MANAGER') {
    return allFolders;
  }

  // VIEWER: public folders + own projects
  return allFolders.filter((f) => f.isPublic || f.createdBy === userId);
}

/**
 * Returns all sources the user is permitted to view.
 * Sources with no folder assignment are accessible to any authenticated org member.
 * Sources inside a folder are accessible if the user can view that folder.
 */
export async function getAccessibleSources(userId: string, orgId: string): Promise<Source[]> {
  const accessibleFolders = await getAccessibleFolders(userId, orgId);
  const folderIds = accessibleFolders.map((f) => f.id);

  return prisma.source.findMany({
    where: {
      OR: [
        { folderId: { in: folderIds } },
        { folderId: null },
      ],
    },
  });
}

/**
 * Returns true if the user may modify (rename, move, delete) the given folder.
 * Only ADMIN and MANAGER roles have write access to folders.
 */
export async function canModifyFolder(userId: string, folderId: string): Promise<boolean> {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) {
    logger.warn(`canModifyFolder: folder ${folderId} not found`);
    return false;
  }

  let role: Role;
  try {
    role = await getUserRole(userId, folder.orgId);
  } catch {
    return false;
  }

  return role === 'ADMIN' || role === 'MANAGER';
}

/**
 * Returns true if the user may include the given source in a report.
 *
 * - ADMIN: any source in the org
 * - MANAGER: any source in the org
 * - VIEWER: only sources in public folders (or sources without a folder)
 */
export async function canSelectForReport(userId: string, sourceId: string): Promise<boolean> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    logger.warn(`canSelectForReport: source ${sourceId} not found`);
    return false;
  }

  // Sources with no folder are accessible to any authenticated user
  if (!source.folderId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user !== null;
  }

  const folder = await prisma.folder.findUnique({ where: { id: source.folderId } });
  if (!folder) return false;

  let role: Role;
  try {
    role = await getUserRole(userId, folder.orgId);
  } catch {
    return false;
  }

  if (role === 'ADMIN' || role === 'MANAGER') return true;

  // VIEWER: only public folder sources
  return folder.isPublic;
}
