import { NextResponse } from 'next/server';
import { listSources } from '@/storage/metadata';

/**
 * GET /api/sources — returns all ingested sources ordered by creation date desc
 */
export async function GET() {
  try {
    const sources = await listSources();
    return NextResponse.json(sources);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list sources';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
