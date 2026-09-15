import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const passwordHash = await bcrypt.hash("Demo123!", 10);
    
    await prisma.user.deleteMany({
      where: { email: "antoni.salim.job@gmail.com" }
    });

    const user = await prisma.user.create({
      data: {
        email: "antoni.salim.job@gmail.com",
        name: "Antoni Salim",
        passwordHash: passwordHash,
        role: "ADMIN",
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
