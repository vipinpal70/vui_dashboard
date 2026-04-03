import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * Handles operations on a specific team membership.
 */

// GET /api/teams/members/[membershipId]
export async function GET(req: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
    try {
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { membershipId } = await params;

        const membership = await prisma.membership.findUnique({
            where: { id: membershipId },
            include: {
                user: { select: { id: true, username: true, email: true } },
                role: { select: { id: true, name: true } },
                team: { select: { id: true, name: true, organizationId: true } }
            }
        });

        if (!membership) {
            return NextResponse.json({ message: "Membership not found" }, { status: 404 });
        }

        const caller = await prisma.user.findUnique({ where: { id: decodedUser.userId } });
        if (!caller || caller.organizationId !== membership.team.organizationId) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ membership }, { status: 200 });
    } catch (error) {
        console.error("Fetch membership error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/teams/members/[membershipId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
    try {
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { membershipId } = await params;
        const currentMembership = await prisma.membership.findUnique({
            where: { id: membershipId },
            include: { team: true }
        });

        if (!currentMembership) {
            return NextResponse.json({ message: "Membership not found" }, { status: 404 });
        }

        const caller = await prisma.user.findUnique({
            where: { id: decodedUser.userId }
        });

        if (!caller) {
            return NextResponse.json({ message: "Caller not found" }, { status: 404 });
        }

        // Authorization check: Admin/Owner OR Manager of this specific team
        let isAuthorized = caller.orgRole === "owner" || caller.orgRole === "admin";
        if (!isAuthorized) {
            const managerMembership = await prisma.membership.findUnique({
                where: { userId_teamId: { userId: caller.id, teamId: currentMembership.teamId } },
                include: { role: true }
            });
            if (managerMembership && managerMembership.role.name === "manager") {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // Even for admins, ensure the membership belongs to their organization
        if (caller.organizationId !== currentMembership.team.organizationId) {
            return NextResponse.json({ message: "Forbidden: Organizational mismatch" }, { status: 403 });
        }

        const { roleId, personalPermissionIDs } = await req.json();

        const updated = await prisma.membership.update({
            where: { id: membershipId },
            data: {
                roleId: roleId,
                personalPermissionIDs: personalPermissionIDs,
            }
        });

        return NextResponse.json({ message: "Membership updated", membership: updated }, { status: 200 });
    } catch (error) {
        console.error("Update membership error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/teams/members/[membershipId]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
    try {
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { membershipId } = await params;
        const currentMembership = await prisma.membership.findUnique({
            where: { id: membershipId },
            include: { team: true }
        });

        if (!currentMembership) {
            return NextResponse.json({ message: "Membership not found" }, { status: 404 });
        }

        const caller = await prisma.user.findUnique({
            where: { id: decodedUser.userId }
        });

        if (!caller) {
            return NextResponse.json({ message: "Caller not found" }, { status: 404 });
        }

        let isAuthorized = caller.orgRole === "owner" || caller.orgRole === "admin";
        if (!isAuthorized) {
            const managerMembership = await prisma.membership.findUnique({
                where: { userId_teamId: { userId: caller.id, teamId: currentMembership.teamId } },
                include: { role: true }
            });
            if (managerMembership && managerMembership.role.name === "manager") {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // Even for admins, ensure the membership belongs to their organization
        if (caller.organizationId !== currentMembership.team.organizationId) {
            return NextResponse.json({ message: "Forbidden: Organizational mismatch" }, { status: 403 });
        }

        await prisma.membership.delete({
            where: { id: membershipId }
        });

        return NextResponse.json({ message: "Member removed from team successfully" }, { status: 200 });
    } catch (error) {
        console.error("Delete membership error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
