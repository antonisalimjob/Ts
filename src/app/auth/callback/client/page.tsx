"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackClientPage() {
  const [status, setStatus] = useState("Authenticating with Google...");

  useEffect(() => {
    const handleAuth = async () => {
      // Ambil token dari hash (#access_token=...) atau query string (?access_token=...)
      const hash = window.location.hash;
      const search = window.location.search;

      let accessToken: string | null = null;

      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", "?"));
        accessToken = params.get("access_token");
      } else if (search && search.includes("access_token")) {
        const params = new URLSearchParams(search);
        accessToken = params.get("access_token");
      }

      if (accessToken) {
        try {
          setStatus("Synchronizing user session...");
          const res = await fetch("/api/auth/google-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            setStatus("Success! Redirecting to workspace...");
            setTimeout(() => {
              window.location.replace("/admin/teams");
            }, 300);
            return;
          } else {
            console.error("Sync failed:", data.error);
          }
        } catch (err) {
          console.error("Auth sync error:", err);
        }
      }

      setStatus("Authentication failed. Returning to login...");
      setTimeout(() => {
        window.location.replace("/login");
      }, 1200);
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-lg font-semibold">{status}</h2>
      <p className="text-xs text-slate-400 mt-1">Please wait while we set up your workspace.</p>
    </div>
  );
}
