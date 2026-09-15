import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
      orderBy: { id: "desc" },
    });
    const teams = await prisma.team.findMany({
      include: { members: true },
    }).catch(() => []);

    return NextResponse.json({ users, teams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, role } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Email tidak valid" },
        { status: 400 }
      );
    }

    const defaultPassword = "Welcome123!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name || email.split("@")[0],
        email: email.toLowerCase().trim(),
        passwordHash: passwordHash,
        role: role || "AGENT",
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${newUser.email} berhasil ditambahkan!`,
      defaultPassword,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Email sudah terdaftar!" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
