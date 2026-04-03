import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { Queue } from "bullmq";
import RedisClient from "../../../../../redis/redisClient";

const signupQueue = new Queue("signup", { connection: RedisClient });

export async function POST(req: NextRequest) {
    try {
        // 1. JWT & Authorization
        const decodedUser = verifyToken(req);

        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized: Invalid or missing token" }, { status: 401 });
        }

        // Look up the caller in the database to determine their org context
        const caller = await prisma.user.findUnique({
            where: { id: decodedUser.userId }
        });

        // Must be an Organization Owner, an Organization Admin, or a global System Admin
        if (!caller || (caller.orgRole !== "owner" && caller.orgRole !== "admin" && caller.role !== "admin")) {
            return NextResponse.json(
                { message: "Forbidden: Only Organization Admins/Owners can explicitly provision users." },
                { status: 403 }
            );
        }

        if (!caller.organizationId) {
            return NextResponse.json(
                { message: "Forbidden: You must belong to an organization to invite users." },
                { status: 403 }
            );
        }

        // 2. Parse body
        const { username, email, password, orgRole } = await req.json();

        if (!username || !email || !password) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // 3. User Collision Check
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ message: "User with this email already exists" }, { status: 400 });
        }

        const requestedOrgRole = orgRole && ["admin", "member"].includes(orgRole) ? orgRole : "member";

        // 4. Create User 
        const hashedPassword = await bcrypt.hash(password, 10);
        const newuser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: "user", // Pre-assign them the standard user system role
                orgRole: requestedOrgRole, // Assign their orgRole (e.g. they can be an org-admin)
                organizationId: caller.organizationId, // Assign them to the caller's organization
                approved: true, // Auto-approve since the Admin/Owner created them
                approvedAt: new Date(),
                createAt: new Date()
            }
        });

        // 5. Fire welcome email / background tasks
        signupQueue.add("signup", { email }, {
            jobId: email,
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: true,
            removeOnFail: false,
        });

        return NextResponse.json({ message: "User provisioned successfully", user: newuser }, { status: 201 });
    } catch (error) {
        console.error("Admin user creation error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        // 1. JWT & Authorization
        const decodedUser = verifyToken(req);
        if (!decodedUser || !decodedUser.userId) {
            return NextResponse.json({ message: "Unauthorized: Invalid or missing token" }, { status: 401 });
        }

        // Look up the caller in the database to determine their org context
        const caller = await prisma.user.findUnique({
            where: { id: decodedUser.userId }
        });

        // Authorization check: Only Org Admin/Owner or System Admin
        if (!caller || (caller.orgRole !== "owner" && caller.orgRole !== "admin" && caller.role !== "admin")) {
            return NextResponse.json(
                { message: "Forbidden: Only Organization Admins/Owners can review users." },
                { status: 403 }
            );
        }

        if (!caller.organizationId) {
            return NextResponse.json(
                { message: "Forbidden: You must belong to an organization to review its users." },
                { status: 403 }
            );
        }

        // 2. Fetch all users in the organization
        // Include memberships, teams, roles, and personal permissions for deep review
        const users = await prisma.user.findMany({
            where: {
                organizationId: caller.organizationId
            },
            include: {
                memberships: {
                    include: {
                        team: true,
                        role: {
                            include: {
                                permissions: true
                            }
                        },
                        personalPermissions: true
                    }
                }
            },
            orderBy: {
                createAt: 'desc'
            }
        });

        return NextResponse.json({ users }, { status: 200 });

    } catch (error) {
        console.error("Admin user list error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
