import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, role } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
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
      message: `User ${email} berhasil ditambahkan!`,
      user: { id: newUser.id, email: newUser.email },
      defaultPassword,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email sudah terdaftar!" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
