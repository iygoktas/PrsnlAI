export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/folders?orgId=<orgId>
 *
 * Returns all folders for an org as a flat list with their sources.
 * Used by SourceSelector to build the folder tree UI.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const folders = await prisma.folder.findMany({
      where: { orgId },
      include: {
        sources: {
          select: { id: true, title: true, type: true, url: true, createdAt: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    logger.error(`GET /api/folders error: ${error}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
