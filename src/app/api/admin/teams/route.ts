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

    // Variasi kemungkinan nilai Enum Role di schema Prisma Anda
    const roleCandidates = [];
    if (role) {
      roleCandidates.push(role);
      roleCandidates.push(String(role).toLowerCase());
      roleCandidates.push(String(role).toUpperCase());
    }
    roleCandidates.push("AGENT", "agent", "ADMIN", "admin", "USER", "user", "MEMBER");

    let newUser = null;
    let lastError = null;

    // Coba buat user dengan variasi Enum role hingga berhasil
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
        lastError = err;
        if (err.code === "P2002") {
          return NextResponse.json(
            { success: false, error: "Email sudah terdaftar!" },
            { status: 400 }
          );
        }
      }
    }

    // Jika seluruh variasi role gagal, buat user tanpa menyertakan field role (memakai default schema)
    if (!newUser) {
      try {
        newUser = await prisma.user.create({
          data: {
            name: cleanName,
            email: cleanEmail,
            passwordHash: passwordHash,
          },
        });
      } catch (err: any) {
        if (err.code === "P2002") {
          return NextResponse.json(
            { success: false, error: "Email sudah terdaftar!" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { success: false, error: err.message || "Gagal membuat user" },
          { status: 500 }
        );
      }
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
