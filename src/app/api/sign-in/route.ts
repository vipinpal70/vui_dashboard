/**
 * This is for user sign-in 
 * Input: email and password
 * Action:
 *  - check user email exit or not
 *  - if not then return account not found
 *  - then check user credentials and confirm they are correct
 *  - if not then return invalid credentials
 *  - allow login and create a jwt token and refresh token
 *      and set the cookies
 *  - jwt token only for 4H and refresh token for 30D
 *  - jwt for auth and refresh for regenerate jwt again
 * 
 *  - add jwt and refresh and their expiry into the user document
 */



import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";



export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        // 1. check user email exit or not
        if (!email || !password) {
            return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true }
        });

        if (!user) {
            return NextResponse.json({ message: "Account not found" }, { status: 404 });
        }

        // 2. then check user credentials and confirm they are correct
        const isPasswordValid = await bcrypt.compare(password, user.password || "");

        if (!isPasswordValid) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        // 3. allow login and create a jwt token and refresh token
        // Use environment variables for secrets
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET || "fallback_refresh_secret";

        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            jwtSecret,
            { expiresIn: "4h" }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            refreshSecret,
            { expiresIn: "30d" }
        );

        // Calculate expiry dates for DB storage
        const accessTokenExpiry = new Date();
        accessTokenExpiry.setHours(accessTokenExpiry.getHours() + 4);

        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

        // 4. add jwt and refresh and their expiry into the user document
        await prisma.user.update({
            where: { id: user.id },
            data: {
                accessToken,
                refreshToken,
                accessTokenExpiry,
                refreshTokenExpiry
            }
        });

        // 5. set the cookies
        const cookieStore = await cookies();

        cookieStore.set("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 4 * 60 * 60, // 4 hours in seconds
            path: "/",
        });

        cookieStore.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
            path: "/",
        });

        return NextResponse.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationName: user.organization?.name || null
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Sign-in error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
