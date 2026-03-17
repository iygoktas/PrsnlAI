import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * PATCH /api/sources/[id] — update the title of a source
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { title } = await request.json();
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const updated = await prisma.source.update({
      where: { id: params.id },
      data: { title: title.trim() },
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/sources/[id] — delete a source and its chunks (cascade)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.source.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
