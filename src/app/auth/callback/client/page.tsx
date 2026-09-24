"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackClientPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace("#", "?"));
      const accessToken = params.get("access_token");

      if (accessToken) {
        try {
          const res = await fetch("/api/auth/google-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          });

          if (res.ok) {
            router.push("/admin/teams");
            return;
          }
        } catch (err) {
          console.error("Auth sync error:", err);
        }
      }

      router.push("/login");
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-lg font-semibold">Authenticating with Google...</h2>
      <p className="text-xs text-slate-400 mt-1">Please wait while we log you into Nexus SM.</p>
    </div>
  );
}
