import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback_secret"
);

// Which prefixes each role can access
const ROLE_ALLOWED_PREFIXES: Record<string, string> = {
    admin: "/admin",
    employee: "/employee",
    client: "/client",
};

const PUBLIC_PATHS = [
    "/signin",
    "/signup",
    "/forgot-password",
    "/api/sign-in",
    "/api/sign-up",
    "/api/forgot-password",
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow public paths through
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (isPublic) return NextResponse.next();

    // Only protect dashboard routes
    const isProtected =
        pathname.startsWith("/admin") ||
        pathname.startsWith("/employee") ||
        pathname.startsWith("/client");

    if (!isProtected) return NextResponse.next();

    // Verify JWT from cookie
    const token = req.cookies.get("accessToken")?.value;

    if (!token) {
        return NextResponse.redirect(new URL("/signin", req.url));
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = payload.role as string;
        const allowedPrefix = ROLE_ALLOWED_PREFIXES[role];

        // Wrong role trying to access another role's route → redirect to their dashboard
        if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
            return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, req.url));
        }

        return NextResponse.next();

    } catch {
        // Token expired or invalid → clear cookie and redirect to sign-in
        const res = NextResponse.redirect(new URL("/signin", req.url));
        res.cookies.delete("accessToken");
        res.cookies.delete("refreshToken");
        return res;
    }
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/employee/:path*",
        "/client/:path*",
        "/signin",
        "/signup",
    ],
};