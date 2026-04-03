import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * Handle membership updates (change roles, add custom permissions)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
    try {
        const { membershipId } = await params;
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const caller = await prisma.user.findUnique({ where: { id: decodedUser.userId } });

        // Authorization check: Must be Admin/Owner or global Admin
        if (!caller || (caller.orgRole !== "owner" && caller.orgRole !== "admin" && caller.role !== "admin")) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { roleId, personalPermissionIDs } = body;

        // Fetch the existing membership to be updated
        const membership = await prisma.membership.findUnique({
            where: { id: membershipId },
            include: { user: true, team: true }
        });

        if (!membership) {
            return NextResponse.json({ message: "Membership not found" }, { status: 404 });
        }

        // Multi-tenant check: Admin can only modify memberships in their organization
        if (membership.user.organizationId !== caller.organizationId && caller.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const updatedMembership = await prisma.membership.update({
            where: { id: membershipId },
            data: {
                roleId: roleId || undefined,
                personalPermissionIDs: personalPermissionIDs || undefined
            }
        });

        return NextResponse.json({ message: "Membership updated successfully", membership: updatedMembership }, { status: 200 });

    } catch (error) {
        console.error("Admin membership update error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

/**
 * Delete a membership (remove a user from a specific team)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
    try {
        const { membershipId } = await params;
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const caller = await prisma.user.findUnique({ where: { id: decodedUser.userId } });

        // Authorization check
        if (!caller || (caller.orgRole !== "owner" && caller.orgRole !== "admin" && caller.role !== "admin")) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const membership = await prisma.membership.findUnique({
            where: { id: membershipId },
            include: { user: true, team: true }
        });

        if (!membership) {
            return NextResponse.json({ message: "Membership not found" }, { status: 404 });
        }

        // Multi-tenant check
        if (membership.user.organizationId !== caller.organizationId && caller.role !== "admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        await prisma.membership.delete({ where: { id: membershipId } });

        return NextResponse.json({ message: "User removed from team" }, { status: 200 });

    } catch (error) {
        console.error("Admin membership delete error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
