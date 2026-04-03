/***
 * This file for user creataion 
 * Input: 
 *  - UserName, 
 *  - Email, 
 *  - Password, 
 *  - Role: Admin | Client
 * 
 * Action:
 *  - check user email is in db to stop creating multiple accounts
 *  - send an email to the user-email for thank you or account done
 *  - send an email to admin for new sign-up form received
 *  - send an web notification only for admins role user
 */


// TODO: Email and web notification are pending


import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Queue } from "bullmq";
import RedisClient from "../../../../redis/redisClient";
import bcrypt from "bcryptjs";

const signupQueue = new Queue("signup", { connection: RedisClient });




type UserForm = {
    username: string;
    email: string;
    password?: string;
    role: "admin" | "client";
    approved: boolean;
    approvedAt?: Date;
    createAt: Date;
}



export async function POST(req: NextRequest) {
    try {
        const { username, email, password, role } = await req.json();

        // 1. check user email already exists in db or not
        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            return NextResponse.json({ message: "User already exists" }, { status: 400 });
        }

        // 2. create the user and their default organization
        const hashedPassword = await bcrypt.hash(password || "", 10);
        const approved = false;
        const approvedAt = null;
        const createAt = new Date();

        let newuser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role, // global system role
                orgRole: "owner", // the one who signs up owns their org
                approved,
                approvedAt,
                createAt,
                ownedOrganizations: {
                    create: {
                        name: `${username}'s Organization`
                    }
                }
            },
            include: {
                ownedOrganizations: true
            }
        });

        // Link the user as an employee of their own organization so queries for employees naturally include the owner
        if (newuser.ownedOrganizations.length > 0) {
            newuser = await prisma.user.update({
                where: { id: newuser.id },
                data: { organizationId: newuser.ownedOrganizations[0].id },
                include: { ownedOrganizations: true } // keeping the type matching
            });
        }

        console.log("New user and organization created:", newuser.email);

        //* TODO: 4. send an email to user email for thank you or account created successful
        // add data into the queue 
        signupQueue.add("signup", { email }, {
            jobId: email,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        });

        //* TODO: 5. send web notification as well as

        return NextResponse.json({ message: "User created successfully", user: newuser }, { status: 201 });

    } catch (error) {
        console.error("Sign-up error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}


