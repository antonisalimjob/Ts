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
      },
      orderBy: { id: "desc" },
    });

    const teams = await prisma.team
      .findMany({
        include: { members: true },
      })
      .catch(() => []);

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
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name || cleanEmail.split("@")[0];

    // Pemetaan presisi dari opsi UI dropdown ke Enum Prisma
    let roleCandidates: string[] = [];

    switch (role) {
      case "IT Lead / Admin":
      case "ADMIN":
        roleCandidates = ["ADMIN", "admin", "LEAD"];
        break;
      case "User / End User":
      case "USER":
        roleCandidates = ["USER", "user", "CUSTOMER", "customer", "END_USER", "MEMBER"];
        break;
      case "IT Support / Agent":
      case "AGENT":
      default:
        roleCandidates = ["AGENT", "agent", "SUPPORT"];
        break;
    }

    let newUser = null;

    // Iterasi kandidat Enum hingga cocok dengan schema PostgreSQL
    for (const r of roleCandidates) {
      try {
        newUser = await prisma.user.create({
          data: {
            name: cleanName,
            email: cleanEmail,
            passwordHash: passwordHash,
            role: r as any,
          },
        });
        if (newUser) break;
      } catch (err: any) {
        if (err.code === "P2002") {
          return NextResponse.json(
            { success: false, error: "Email sudah terdaftar!" },
            { status: 400 }
          );
        }
      }
    }

    // Fallback: Jika tidak ada variasi Enum yang cocok, buat user dengan default schema
    if (!newUser) {
      newUser = await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          passwordHash: passwordHash,
        },
      });
    }

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
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
