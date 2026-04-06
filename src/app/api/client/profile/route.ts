import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req);
    if (!payload?.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ message: "Organization not found" }, { status: 404 });
    }

    const profile = await prisma.clientProfile.findFirst({
      where: { organizationId: user.organizationId },
    });

    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET Profile Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = verifyToken(req);
    if (!payload?.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ message: "Organization not found" }, { status: 404 });
    }

    const body = await req.json();

    // Remove ID if present to avoid prisma errors
    const { id, userId, organizationId, ...data } = body;

    console.log("Saving Profile Data:", {
      userId: payload.userId,
      organizationId: user.organizationId,
      ...data
    });

    const existingProfile = await prisma.clientProfile.findFirst({
      where: { organizationId: user.organizationId },
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.clientProfile.update({
        where: { id: existingProfile.id },
        data: {
          ...data,
          userId: payload.userId,
        },
      });
    } else {
      profile = await prisma.clientProfile.create({
        data: {
          ...data,
          userId: payload.userId,
          organizationId: user.organizationId,
        },
      });
    }

    return NextResponse.json({ message: "Profile saved successfully", profile });
  } catch (error: any) {
    console.error("POST Profile Error:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}