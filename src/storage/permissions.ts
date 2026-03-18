import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { FolderError } from '@/lib/errors';

export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';

/**
 * Returns the user's role within a given organization.
 * Throws FolderError if the user is not a member of the org.
 */
export async function getUserRole(userId: string, orgId: string): Promise<Role> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new FolderError(`User ${userId} not found`, 'NOT_FOUND');
  }
  if (user.orgId !== orgId) {
    throw new FolderError(`User ${userId} does not belong to org ${orgId}`, 'UNAUTHORIZED');
  }
  return user.role as Role;
}

/**
 * Determines whether a user can view a folder.
 *
 * Rules:
 *  - ADMIN: can view any folder in their org.
 *  - MANAGER: can view public folders or folders they created.
 *  - VIEWER: can view only public folders.
 */
export async function canViewFolder(userId: string, folderId: string): Promise<boolean> {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) {
    logger.warn(`canViewFolder: folder ${folderId} not found`);
    return false;
  }

  let role: Role;
  try {
    role = await getUserRole(userId, folder.orgId);
  } catch {
    return false;
  }

  if (role === 'ADMIN') return true;
  if (folder.isPublic) return true;
  if (role === 'MANAGER' && folder.createdBy === userId) return true;

  return false;
}

/**
 * Determines whether a user can select a source for report generation.
 *
 * Rules:
 *  - Sources without a folder are accessible to all org members.
 *  - Sources in a folder are accessible if canViewFolder returns true.
 */
export async function canSelectForReport(userId: string, sourceId: string): Promise<boolean> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    logger.warn(`canSelectForReport: source ${sourceId} not found`);
    return false;
  }

  // Sources not in any folder are accessible to all authenticated users
  if (!source.folderId) {
    // Still verify user exists — an unknown userId should return false
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user !== null;
  }

  return canViewFolder(userId, source.folderId);
}
