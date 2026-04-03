import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/roles
 * Returns all roles available to the caller's organization:
 *   - Global preset roles (organizationId is null / unset)
 *   - Custom org-scoped roles (organizationId === caller.organizationId)
 */
export async function GET(req: NextRequest) {
    try {
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const caller = await prisma.user.findUnique({
            where: { id: decodedUser.userId },
        });

        if (!caller) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Fetch global roles + org-specific custom roles
        const roles = await prisma.role.findMany({
            where: {
                OR: [
                    { organizationId: null },
                    { organizationId: { isSet: false } },
                    ...(caller.organizationId
                        ? [{ organizationId: caller.organizationId }]
                        : []),
                ],
            },
            include: {
                permissions: { select: { action: true } },
            },
            orderBy: { name: "asc" },
        });

        const shaped = roles.map((r) => ({
            id: r.id,
            name: r.name,
            organizationId: r.organizationId ?? null,
            isCustom: !!r.organizationId,
            permissions: r.permissions.map((p) => p.action),
        }));

        return NextResponse.json({ roles: shaped }, { status: 200 });
    } catch (error) {
        console.error("Fetch roles error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
