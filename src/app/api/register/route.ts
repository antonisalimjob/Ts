import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const passwordHash = await bcrypt.hash("Demo123!", 10);

    // Hapus user jika sudah ada untuk menghindari conflict
    await prisma.user.deleteMany({
      where: { email: "antoni.salim.job@gmail.com" },
    });

    // Buat User Baru Native via Prisma
    const user = await prisma.user.create({
      data: {
        email: "antoni.salim.job@gmail.com",
        name: "Antoni Salim",
        passwordHash: passwordHash,
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      success: true,
      message: "User berhasil dibuat!",
      user: { id: user.id, email: user.email },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
