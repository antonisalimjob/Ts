"use client";

import { useEffect } from "react";

export default function AuthCallbackClientPage() {
  useEffect(() => {
    const handleAuth = async () => {
      // Ambil token dari URL Fragment (#access_token=...) atau query string
      const hash = window.location.hash;
      const search = window.location.search;
      
      const params = new URLSearchParams(
        hash ? hash.replace("#", "?") : search
      );
      const accessToken = params.get("access_token");

      if (accessToken) {
        try {
          // Sync user ke Prisma & simpan cookie
          const res = await fetch("/api/auth/google-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          });

          if (res.ok) {
            // Gunakan Hard Redirect agar cookie user_session langsung aktif secara Server-Side
            window.location.href = "/admin/teams";
            return;
          }
        } catch (err) {
          console.error("Auth sync error:", err);
        }
      }

      // Jika gagal atau tidak ada token, kembalikan ke login
      window.location.href = "/login";
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-lg font-semibold">Authenticating with Google...</h2>
      <p className="text-xs text-slate-400 mt-1">Please wait while we log you into Nexus SM.</p>
    </div>
  );
}
