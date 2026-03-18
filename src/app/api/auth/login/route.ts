export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login
 * Validates credentials and returns session payload.
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const v = schema.safeParse(body);
    if (!v.success) {
      return NextResponse.json({ error: v.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = v.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Generic message — never reveal whether email exists
    const INVALID = 'Invalid email or password';

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    return NextResponse.json({
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
