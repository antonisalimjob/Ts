import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { authSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    // Cari user di database berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Email atau password salah" },
        { status: 401 }
      );
    }

    // Jika user terdaftar via Google OAuth, beri petunjuk login
    if (user.passwordHash === "OAUTH_GOOGLE_ACCOUNT") {
      return NextResponse.json(
        { success: false, error: "Akun ini terdaftar via Google. Silakan klik tombol Sign In with Google." },
        { status: 400 }
      );
    }

    // Verifikasi kata sandi
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Email atau password salah" },
        { status: 401 }
      );
    }

    // Buat JWT Session resmi aplikasi
    const secret = new TextEncoder().encode(authSecret());
    const jwtToken = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    const res = NextResponse.json({ success: true, user });

    // Set cookie resmi SESSION_COOKIE
    res.cookies.set({
      name: SESSION_COOKIE,
      value: jwtToken,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
