import { NextRequest, NextResponse } from "next/server";
import { hasPermission, verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
    try {
        const decodedUser = verifyToken(req);

        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const userId = decodedUser.userId;
        const { teamId, resourceId } = await req.json();

        if (!teamId || !resourceId) {
            return NextResponse.json({ message: "Missing required fields: teamId, resourceId" }, { status: 400 });
        }

        // 🛡 Centralized Check: Does the user have 'delete' permission on this Team?
        const canDelete = await hasPermission(userId, teamId, "delete");

        if (!canDelete) {
            return NextResponse.json({ message: "Forbidden: You don't have permission to delete in this team" }, { status: 403 });
        }

        // --- Logic to delete the requested resource proceeds here ---
        // await prisma.someResource.delete({ where: { id: resourceId } });

        return NextResponse.json({ message: "Resource deleted successfully" }, { status: 200 });

    } catch (error) {
        console.error("Delete action error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
