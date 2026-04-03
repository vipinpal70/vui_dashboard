import prisma from "./prisma";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

// Ensure secrets match the ones used in sign-in logic
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

/**
 * Validates the token from either the Authorization header or the secure HTTP cookie,
 * returning the extracted user payload if valid.
 */
export function verifyToken(req: NextRequest) {
  let token: string | undefined;

  // 1. Check for Authorization header first
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  
  // 2. Fallback to extracting from the NextRequest cookies (set during Sign-in)
  if (!token) {
    token = req.cookies.get("accessToken")?.value;
  }

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Checks if a user has a specific permission within a team.
 *
 * @param userId - The ID of the User
 * @param teamId - The ID of the Team
 * @param action - The name of the permission action (e.g., 'read', 'write', 'delete')
 * @returns boolean indicating if access is granted
 */
export async function hasPermission(userId: string, teamId: string, action: string): Promise<boolean> {
  // 1. Check Org Role first (Owner/Admin get full access)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgRole: true }
  });

  if (user?.orgRole === "owner" || user?.orgRole === "admin") {
    return true;
  }

  // 2. Fetch the user's membership for this team, 
  // along with the populated role and its permissions, and personal overrides.
  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
      personalPermissions: true,
    },
  });

  if (!membership) {
    return false;
  }

  // 3. Override: If any personal permissions are explicitly set, they replace the defaults entirely
  if (membership.personalPermissions && membership.personalPermissions.length > 0) {
    return membership.personalPermissions.some(
      (permission) => permission.action === action
    );
  }

  // 4. Default: Use the permissions from the assigned team role
  return membership.role.permissions.some(
    (permission) => permission.action === action
  );
}

/**
 * Convenience wrapper for API routes or Server Actions.
 * Throws an Error if unauthorized, or returns the membership details.
 * 
 * @param userId - The ID of the User
 * @param teamId - The ID of the Team
 * @param action - Required permission action
 */
export async function requirePermission(userId: string, teamId: string, action: string) {
  const isAllowed = await hasPermission(userId, teamId, action);

  if (!isAllowed) {
    throw new Error(`Forbidden: User does not have '${action}' permission for this team.`);
  }
}
