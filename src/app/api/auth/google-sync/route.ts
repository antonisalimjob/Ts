import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Cari user yang sudah terdaftar
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // Jika user belum ada, daftarkan otomatis dengan role 'USER'
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: fullName,
          passwordHash: "OAUTH_GOOGLE_ACCOUNT", // Placeholder untuk akun Google OAuth
          role: "USER" as any,                  // Memastikan semua sign in Google ber-level USER
        },
      });
    }

    const res = NextResponse.json({ success: true, user });

    res.cookies.set({
      name: "user_session",
      value: JSON.stringify({ id: user.id, email: user.email, role: user.role }),
      httpOnly: true,
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
