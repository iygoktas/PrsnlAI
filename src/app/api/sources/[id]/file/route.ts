export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { getSource } from '@/storage/metadata';

/**
 * GET /api/sources/[id]/file
 * Streams the original PDF file for a source.
 * Returns 404 if the source is not a PDF or the file is missing.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const source = await getSource(params.id).catch(() => null);

  if (!source || source.type !== 'PDF') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!source.filePath) {
    return NextResponse.json(
      { error: 'File not available — PDF was ingested before file storage was enabled' },
      { status: 404 },
    );
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(source.filePath);
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(source.title)}.pdf"`,
      'Content-Length': String(fileBuffer.length),
    },
  });
}
