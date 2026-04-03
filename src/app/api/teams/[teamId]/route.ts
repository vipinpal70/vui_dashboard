import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * Handles operations on a specific team.
 */

// GET /api/teams/[teamId]
export async function GET(req: NextRequest, { params }: { params: { teamId: string } }) {
    try {
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const teamId = params.teamId;

        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                memberships: {
                    include: {
                        user: { select: { id: true, username: true, email: true } },
                        role: { select: { id: true, name: true } }
                    }
                },
                roles: true, // Include team-specific roles
            }
        });

        if (!team) {
            return NextResponse.json({ message: "Team not found" }, { status: 404 });
        }

        // Check if user belongs to the same organization
        const caller = await prisma.user.findUnique({ where: { id: decodedUser.userId } });
        if (!caller || caller.organizationId !== team.organizationId) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ team }, { status: 200 });
    } catch (error) {
        console.error("Fetch team error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}


// PATCH /api/teams/[teamId]
export async function PATCH(req: NextRequest, { params }: { params: { teamId: string } }) {
    try {
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const caller = await prisma.user.findUnique({ where: { id: decodedUser.userId } });
        if (!caller || (caller.orgRole !== "owner" && caller.orgRole !== "admin")) {
            return NextResponse.json({ message: "Forbidden: Only admins can update teams" }, { status: 403 });
        }

        const teamId = params.teamId;
        const { name } = await req.json();

        if (!name) {
            return NextResponse.json({ message: "Name is required" }, { status: 400 });
        }

        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team || team.organizationId !== caller.organizationId) {
            return NextResponse.json({ message: "Team not found or access denied" }, { status: 404 });
        }

        const updatedTeam = await prisma.team.update({
            where: { id: teamId },
            data: { name }
        });

        return NextResponse.json({ message: "Team updated successfully", team: updatedTeam }, { status: 200 });
    } catch (error) {
        console.error("Update team error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}



// DELETE /api/teams/[teamId]
export async function DELETE(req: NextRequest, { params }: { params: { teamId: string } }) {
    try {
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const caller = await prisma.user.findUnique({ where: { id: decodedUser.userId } });
        if (!caller || (caller.orgRole !== "owner" && caller.orgRole !== "admin")) {
            return NextResponse.json({ message: "Forbidden: Only admins can delete teams" }, { status: 403 });
        }

        const teamId = params.teamId;

        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team || team.organizationId !== caller.organizationId) {
            return NextResponse.json({ message: "Team not found or access denied" }, { status: 404 });
        }

        // Note: Cascade delete for Roles and Memberships is handled by Prisma schema if db push was healthy.
        // We'll perform the delete directly.
        await prisma.team.delete({
            where: { id: teamId }
        });

        return NextResponse.json({ message: "Team and associated roles/memberships deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Delete team error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
