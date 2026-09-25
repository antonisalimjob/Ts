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

    const supabaseUrl = "https://hbblarnhwbvmotzjxjsh.supabase.co";
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      },
    });

    if (!userRes.ok) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const userData = await userRes.json();
    const email = userData.email;
    const fullName = userData.user_metadata?.full_name || email.split("@")[0];

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email not found" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: fullName,
          passwordHash: "OAUTH_GOOGLE_ACCOUNT",
          role: "USER" as any,
        },
      });
    }

    // Buat JWT Token resmi agar lolos verifikasi jwtVerify di middleware.ts
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

    // Set cookie menggunakan NAMA COOKIE RESMI yang dibaca oleh middleware (SESSION_COOKIE)
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
