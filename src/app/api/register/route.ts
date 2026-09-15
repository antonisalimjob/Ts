import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const passwordHash = await bcrypt.hash("Demo123!", 10);

    // 1. Hapus user lama jika ada
    await prisma.user.deleteMany({
      where: { email: "antoni.salim.job@gmail.com" },
    });

    // 2. Pastikan Role 'ADMIN' ada di database (jika schema menggunakan relasi Role)
    let adminRole = null;
    try {
      adminRole = await (prisma as any).role.upsert({
        where: { id: "ADMIN" },
        update: {},
        create: { id: "ADMIN", name: "ADMIN" },
      });
    } catch (e) {
      // Abaikan jika schema tidak menggunakan tabel Role terpisah
    }

    // 3. Buat User Admin dengan mendukung kedua kemungkinan struktur Prisma Schema
    const userData: any = {
      email: "antoni.salim.job@gmail.com",
      name: "Antoni Salim",
      passwordHash: passwordHash,
      role: "ADMIN",
    };

    if (adminRole) {
      userData.roleId = adminRole.id;
    }

    const user = await prisma.user.create({
      data: userData,
    });

    return NextResponse.json({
      success: true,
      message: "User berhasil diperbarui!",
      user: { id: user.id, email: user.email },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
