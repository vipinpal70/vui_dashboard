import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// A helper function to initialize predefined roles and predefined permissions
async function ensureDefaultRolesExist(): Promise<Record<string, string>> {
    // 1. Ensure core permissions exist (view, edit, create, delete, approve)
    const permissionNames = ["view", "edit", "create", "delete", "approve"];
    const permissionMap: Record<string, string> = {};

    for (const pName of permissionNames) {
        const perm = await prisma.permission.upsert({
            where: { action: pName },
            update: {},
            create: { action: pName }
        });
        permissionMap[pName] = perm.id;
    }

    // 2. Define standard global roles + content production roles and their assigned permissions
    const rolesConfig = {
        "manager": ["view", "edit", "create", "delete", "approve"],
        "co-manager": ["view", "edit", "create", "approve"],
        "team_lead": ["view", "edit", "create", "approve"],
        "member": ["view"],
    };

    // 3. Upsert Roles and tightly couple their permission lists
    for (const [roleName, permList] of Object.entries(rolesConfig)) {
        const mappedPermIDs = permList.map(p => permissionMap[p]);

        const existing = await prisma.role.findFirst({
            where: { name: roleName }
        });

        if (existing) {
            // Update the existing role to guarantee it has the exact predefined permissions
            await prisma.role.update({
                where: { id: existing.id },
                data: { permissionIDs: mappedPermIDs }
            });
        } else {
            // Create exactly as defined
            await prisma.role.create({
                data: {
                    name: roleName,
                    permissionIDs: mappedPermIDs
                }
            });
        }
    }

    return permissionMap;
}

export async function POST(req: NextRequest) {
    try {
        // 1. JWT checking
        const decodedUser = verifyToken(req);

        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized: Invalid or missing token" }, { status: 401 });
        }

        // Look up the caller's Organization mapping
        const caller = await prisma.user.findUnique({
            where: { id: decodedUser.userId }
        });

        if (!caller || !caller.organizationId) {
            return NextResponse.json(
                { message: "Forbidden: You must belong to an organization to create teams." },
                { status: 403 }
            );
        }

        // Must be an Organization Owner or Admin to create Teams
        if (caller.orgRole !== "owner" && caller.orgRole !== "admin") {
            return NextResponse.json(
                { message: "Forbidden: Only Organization Admins can create new teams." },
                { status: 403 }
            );
        }

        // 2. Body parsing
        const { name, customRoles } = await req.json();

        if (!name || typeof name !== "string") {
            return NextResponse.json({ message: "A valid team 'name' is required" }, { status: 400 });
        }

        // 3. Guarantee our standard Team Roles exist globally
        const permissionMap = await ensureDefaultRolesExist();

        // 4. Create the Team under the caller's organization
        const newTeam = await prisma.team.create({
            data: {
                name: name,
                organizationId: caller.organizationId
            }
        });

        // 5. Create any custom org-scoped roles requested (e.g. DevOps, Frontend, Intern)
        //    Each role carries its own permission set chosen by the admin.
        if (Array.isArray(customRoles) && customRoles.length > 0) {
            for (const roleEntry of customRoles) {
                // Support both legacy string format and new { name, permissions } object
                const roleName = typeof roleEntry === "string" ? roleEntry : roleEntry.name;
                const rolePerms: string[] = typeof roleEntry === "string"
                    ? ["view"]
                    : (Array.isArray(roleEntry.permissions) ? roleEntry.permissions : ["view"]);

                const trimmed = String(roleName).trim();
                if (!trimmed) continue;

                // Map permission names to IDs
                const mappedPermIDs = rolePerms
                    .map((p: string) => permissionMap[p])
                    .filter(Boolean);

                // Avoid duplicating an existing role with the same name IN THIS TEAM
                const exists = await prisma.role.findFirst({
                    where: {
                        name: { equals: trimmed, mode: "insensitive" },
                        organizationId: caller.organizationId,
                        teamId: newTeam.id,
                    }
                });

                if (!exists) {
                    await prisma.role.create({
                        data: {
                            name: trimmed,
                            organizationId: caller.organizationId,
                            teamId: newTeam.id,
                            permissionIDs: mappedPermIDs,
                        }
                    });
                } else {
                    // Update existing role's permissions if it was already there
                    await prisma.role.update({
                        where: { id: exists.id },
                        data: { permissionIDs: mappedPermIDs }
                    });
                }
            }
        }

        // 6. Automatically add the creator as the 'manager' of this newly created team
        const managerRole = await prisma.role.findFirst({
            where: {
                name: "manager",
                OR: [{ organizationId: null }, { organizationId: { isSet: false } }]
            }
        });
        if (managerRole) {
            await prisma.membership.create({
                data: {
                    userId: caller.id,
                    teamId: newTeam.id,
                    roleId: managerRole.id
                }
            });
        }

        return NextResponse.json({
            message: "Team created successfully",
            team: newTeam
        }, { status: 201 });

    } catch (error) {
        console.error("Team creation error:", error);
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
            return NextResponse.json({ teams: [] }, { status: 200 }); // User has no org, therefore no teams
        }

        // Only return Teams for this specific organization
        const teams = await prisma.team.findMany({
            where: { organizationId: caller.organizationId }
        });

        return NextResponse.json({ teams }, { status: 200 });

    } catch (error) {
        console.error("Fetch teams error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
