import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * Update a user (global profile fields only)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const { userId } = await params;
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const caller = await prisma.user.findUnique({ where: { id: decodedUser.userId } });

        // Authorization check: Must be Admin/Owner of the organization or global Admin
        if (!caller || (caller.orgRole !== "owner" && caller.orgRole !== "admin" && caller.role !== "admin")) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { username, email, orgRole, approved } = body;

        // Fetch the user to be updated
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });

        if (!targetUser) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Multi-tenant check: Admin can only update users in their organization
        if (targetUser.organizationId !== caller.organizationId && caller.role !== "admin") {
            return NextResponse.json({ message: "Forbidden: User belongs to another organization" }, { status: 403 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username: username || undefined,
                email: email || undefined,
                orgRole: orgRole || undefined,
                approved: approved !== undefined ? approved : undefined,
                approvedAt: approved === true && !targetUser.approved ? new Date() : undefined
            }
        });

        return NextResponse.json({ message: "User updated successfully", user: updatedUser }, { status: 200 });

    } catch (error) {
        console.error("Admin user update error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

/**
 * Delete a user and their memberships (cascading delete handled by DB/Prisma)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const { userId } = await params;
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const caller = await prisma.user.findUnique({ where: { id: decodedUser.userId } });

        // Authorization check
        if (!caller || (caller.orgRole !== "owner" && caller.orgRole !== "admin" && caller.role !== "admin")) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });

        if (!targetUser) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Multi-tenant check
        if (targetUser.organizationId !== caller.organizationId && caller.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });

    } catch (error) {
        console.error("Admin user delete error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
