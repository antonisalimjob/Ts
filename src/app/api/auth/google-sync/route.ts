import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { authSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accessToken = body?.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "No token provided" },
        { status: 400 }
      );
    }

    let email: string | null = null;
    let fullName: string | null = null;

    // Decode JWT token payload secara langsung tanpa ternary expression yang bermasalah
    try {
      const parts = accessToken.split(".");
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadStr);
        email = payload.email || payload.user_metadata?.email || null;
        fullName =
          payload.user_metadata?.full_name ||
          payload.name ||
          (email ? email.split("@")[0] : null);
      }
    } catch (e) {
      console.warn("Direct JWT decode fallback triggered");
    }

    // Fallback verifikasi via Supabase REST API jika decode manual gagal
    if (!email) {
      const supabaseUrl = "https://hbblarnhwbvmotzjxjsh.supabase.co";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
        },
      });

      if (!userRes.ok) {
        return NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 401 }
        );
      }

      const userData = await userRes.json();
      email = userData.email || null;
      fullName =
        userData.user_metadata?.full_name ||
        (email ? email.split("@")[0] : null);
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email not found in token" },
        { status: 400 }
      );
    }

    // Cari user di database Prisma
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // Otomatis registrasi dengan role USER jika akun belum ada
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: fullName || email.split("@")[0],
          passwordHash: "OAUTH_GOOGLE_ACCOUNT",
          role: "USER" as any,
        },
      });
    }

    // Buat JWT Session resmi aplikasi agar dikenali middleware
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
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
