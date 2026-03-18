import { Folder } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { FolderError } from '@/lib/errors';

export interface CreateFolderInput {
  name: string;
  orgId: string;
  parentId?: string;
  isPublic: boolean;
  createdBy: string;
}

export interface UpdateFolderInput {
  name?: string;
  isPublic?: boolean;
  parentId?: string | null;
}

/**
 * Creates a new folder. If parentId is provided, validates it belongs to the same org.
 */
export async function createFolder(data: CreateFolderInput): Promise<Folder> {
  if (!data.name.trim()) {
    throw new FolderError('Folder name cannot be empty', 'INVALID_INPUT');
  }

  if (data.parentId) {
    const parent = await prisma.folder.findUnique({ where: { id: data.parentId } });
    if (!parent) {
      throw new FolderError(`Parent folder ${data.parentId} not found`, 'NOT_FOUND');
    }
    if (parent.orgId !== data.orgId) {
      throw new FolderError('Parent folder belongs to a different organization', 'ORG_MISMATCH');
    }
  }

  try {
    const folder = await prisma.folder.create({
      data: {
        name: data.name.trim(),
        orgId: data.orgId,
        parentId: data.parentId ?? null,
        isPublic: data.isPublic,
        createdBy: data.createdBy,
      },
    });
    logger.info(`Created folder: ${folder.id} (org: ${folder.orgId})`);
    return folder;
  } catch (error) {
    logger.error(`Failed to create folder: ${error}`);
    throw error;
  }
}

/**
 * Retrieves a folder by ID, including its immediate children.
 */
export async function getFolder(id: string): Promise<Folder | null> {
  try {
    return await prisma.folder.findUnique({ where: { id } });
  } catch (error) {
    logger.error(`Failed to get folder ${id}: ${error}`);
    throw error;
  }
}

/**
 * Lists folders for an org. If parentId is undefined, returns root folders.
 * Pass null explicitly to get all folders in the org regardless of level.
 */
export async function listFolders(orgId: string, parentId?: string): Promise<Folder[]> {
  try {
    const where =
      parentId !== undefined
        ? { orgId, parentId }
        : { orgId, parentId: null };

    const folders = await prisma.folder.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    logger.info(`Listed ${folders.length} folders (org: ${orgId}, parentId: ${parentId ?? 'root'})`);
    return folders;
  } catch (error) {
    logger.error(`Failed to list folders: ${error}`);
    throw error;
  }
}

/**
 * Updates folder metadata (name, visibility, or parent).
 */
export async function updateFolder(id: string, data: UpdateFolderInput): Promise<Folder> {
  if (data.name !== undefined && !data.name.trim()) {
    throw new FolderError('Folder name cannot be empty', 'INVALID_INPUT');
  }

  const existing = await prisma.folder.findUnique({ where: { id } });
  if (!existing) {
    throw new FolderError(`Folder ${id} not found`, 'NOT_FOUND');
  }

  if (data.parentId) {
    if (data.parentId === id) {
      throw new FolderError('A folder cannot be its own parent', 'INVALID_INPUT');
    }
    const parent = await prisma.folder.findUnique({ where: { id: data.parentId } });
    if (!parent) {
      throw new FolderError(`Parent folder ${data.parentId} not found`, 'NOT_FOUND');
    }
    if (parent.orgId !== existing.orgId) {
      throw new FolderError('Parent folder belongs to a different organization', 'ORG_MISMATCH');
    }
  }

  try {
    const folder = await prisma.folder.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });
    logger.info(`Updated folder: ${folder.id}`);
    return folder;
  } catch (error) {
    logger.error(`Failed to update folder ${id}: ${error}`);
    throw error;
  }
}

/**
 * Deletes a folder and all its descendants. Sources in deleted folders have their
 * folderId set to null (they are preserved, not deleted).
 */
export async function deleteFolder(id: string): Promise<void> {
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder) {
    throw new FolderError(`Folder ${id} not found`, 'NOT_FOUND');
  }

  const descendantIds = await collectDescendantIds(id);
  const allIds = [id, ...descendantIds];

  try {
    await prisma.$transaction(async (tx) => {
      // Detach sources from all affected folders before deletion
      await tx.source.updateMany({
        where: { folderId: { in: allIds } },
        data: { folderId: null },
      });

      // Delete leaves first, then parents (bottom-up)
      for (const folderId of [...descendantIds].reverse()) {
        await tx.folder.delete({ where: { id: folderId } });
      }
      await tx.folder.delete({ where: { id } });
    });
    logger.info(`Deleted folder ${id} and ${descendantIds.length} descendants`);
  } catch (error) {
    logger.error(`Failed to delete folder ${id}: ${error}`);
    throw error;
  }
}

/**
 * Moves the given sources into the specified folder using a transaction.
 */
export async function moveSourcesToFolder(sourceIds: string[], folderId: string): Promise<void> {
  if (sourceIds.length === 0) return;

  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) {
    throw new FolderError(`Folder ${folderId} not found`, 'NOT_FOUND');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.source.updateMany({
        where: { id: { in: sourceIds } },
        data: { folderId },
      });
    });
    logger.info(`Moved ${sourceIds.length} sources to folder ${folderId}`);
  } catch (error) {
    logger.error(`Failed to move sources to folder ${folderId}: ${error}`);
    throw error;
  }
}

/** Recursively collects all descendant folder IDs (not including the root). */
async function collectDescendantIds(parentId: string): Promise<string[]> {
  const children = await prisma.folder.findMany({
    where: { parentId },
    select: { id: true },
  });

  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const nested = await collectDescendantIds(child.id);
    ids.push(...nested);
  }
  return ids;
}
