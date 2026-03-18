import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthError } from '@/lib/errors';
import type { Role } from '@/storage/permissions';

export interface AuthContext {
  userId: string;
  email: string;
  orgId: string;
  role: Role;
}

/**
 * Parses user identity from the x-user-id request header.
 * Looks up the user in the DB to hydrate the full AuthContext.
 *
 * In production this would validate a signed JWT or session token.
 * The x-user-id header should be set by an upstream API gateway or auth proxy.
 *
 * @throws AuthError if the header is missing or the user is not found
 */
export async function parseUserFromRequest(req: NextRequest): Promise<AuthContext> {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    throw new AuthError('Missing x-user-id header', 'MISSING_AUTH');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AuthError(`User ${userId} not found`, 'USER_NOT_FOUND');
  }

  return {
    userId: user.id,
    email: user.email,
    orgId: user.orgId,
    role: user.role as Role,
  };
}

/**
 * Returns true if the user is a member of the given organization.
 */
export async function validateOrgOwnership(userId: string, orgId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.orgId === orgId;
}

/**
 * Returns true if the given role is in the required-roles list.
 */
export function validateRole(role: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(role);
}
