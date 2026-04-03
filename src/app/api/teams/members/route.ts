import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * Assign a User to a Team with a distinct Role.
 * Because of our Database schema, a single User can be added to multiple teams,
 * and they can have a completely different Role (and therefore different permissions)
 * scoped strictly to each individual team!
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Protect the route
        const decodedUser = verifyToken(req);

        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized: Invalid or missing token" }, { status: 401 });
        }

        // Look up caller's org context
        const caller = await prisma.user.findUnique({
            where: { id: decodedUser.userId }
        });

        if (!caller || !caller.organizationId) {
             return NextResponse.json({ message: "Forbidden: You must belong to an organization." }, { status: 403 });
        }

        // 2. Parse request
        const { targetUserId, teamId, roleName, personalPermissions } = await req.json();

        if (!targetUserId || !teamId || !roleName) {
            return NextResponse.json({ message: "Missing required fields: targetUserId, teamId, roleName" }, { status: 400 });
        }

        // 3. Authorization & Scope Checks
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser || targetUser.organizationId !== caller.organizationId) {
            return NextResponse.json({ message: "Forbidden: Target user does not belong to your organization." }, { status: 403 });
        }

        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team || team.organizationId !== caller.organizationId) {
            return NextResponse.json({ message: "Forbidden: Team does not belong to your organization." }, { status: 403 });
        }

        let isAuthorized = caller.orgRole === "owner" || caller.orgRole === "admin";
        
        if (!isAuthorized) {
             const callerMembership = await prisma.membership.findUnique({
                 where: { userId_teamId: { userId: caller.id, teamId: team.id } },
                 include: { role: true }
             });
             if (callerMembership && callerMembership.role.name === "manager") {
                 isAuthorized = true;
             }
        }

        if (!isAuthorized) {
            return NextResponse.json(
                { message: "Forbidden: You must be an Organization Admin or Team Manager to assign users." },
                { status: 403 }
            );
        }

        // 4. Look up the role (globally pre-defined OR custom to caller's org)
        const role = await prisma.role.findFirst({
            where: { 
                name: roleName,
                OR: [
                    { organizationId: null },
                    { organizationId: { isSet: false } },
                    { organizationId: caller.organizationId }
                ]
            }
        });

        if (!role) {
            return NextResponse.json({ message: `Role '${roleName}' does not exist.` }, { status: 404 });
        }

        // Map requested personal permissions to IDs
        let personalPermissionIDs: string[] = [];
        if (personalPermissions && Array.isArray(personalPermissions) && personalPermissions.length > 0) {
            const perms = await prisma.permission.findMany({
                where: { action: { in: personalPermissions } }
            });
            personalPermissionIDs = perms.map((p: any) => p.id);
        }

        // 5. Create or Update the user's Membership in this specific Team.
        const membership = await prisma.membership.upsert({
            where: {
                userId_teamId: {
                    userId: targetUserId,
                    teamId: teamId
                }
            },
            update: {
                // If they are already in the team, simply change their role.
                roleId: role.id,
                personalPermissionIDs: personalPermissionIDs
            },
            create: {
                // Otherwise, create a brand new membership link for this team.
                userId: targetUserId,
                teamId: teamId,
                roleId: role.id,
                personalPermissionIDs: personalPermissionIDs
            }
        });

        return NextResponse.json({
            message: `User successfully assigned as '${roleName}' for the team!`,
            membership
        }, { status: 200 });

    } catch (error) {
        console.error("Membership assignment error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}


export async function GET(req: NextRequest) {
    try {
        const decodedUser = verifyToken(req);

        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const caller = await prisma.user.findUnique({
            where: { id: decodedUser.userId }
        });

        if (!caller || !caller.organizationId) {
             return NextResponse.json({ memberships: [] }, { status: 200 });
        }

        const memberships = await prisma.membership.findMany({
            where: {
                team: {
                    organizationId: caller.organizationId
                }
            },
            include: {
                user: {
                    select: { id: true, username: true, email: true },
                },
                role: {
                    select: { name: true },
                },
                team: {
                    select: { id: true, name: true },
                },
                personalPermissions: {
                    select: { action: true },
                }
            },
        });

        // Shape the response to match what the frontend expects
        const shaped = memberships.map((m: any) => ({
            id: m.id,
            userId: m.userId,
            teamId: m.teamId,
            roleName: m.role.name,
            userName: m.user.username,
            userEmail: m.user.email,
            personalPermissions: m.personalPermissions?.map((p: any) => p.action) || [],
        }));

        return NextResponse.json({ memberships: shaped }, { status: 200 });

    } catch (error) {
        console.error("Fetch memberships error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}