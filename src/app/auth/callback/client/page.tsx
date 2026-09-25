"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackClientPage() {
  const [status, setStatus] = useState("Authenticating with Google...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      // Ambil token dari URL Fragment (#access_token=...) atau Query (?access_token=...)
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

      if (!accessToken) {
        setErrorMsg("No access token found in URL redirect.");
        setTimeout(() => {
          window.location.replace("/login");
        }, 3000);
        return;
      }

      try {
        setStatus("Synchronizing user account...");
        const res = await fetch("/api/auth/google-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setStatus("Success! Entering workspace...");
          setTimeout(() => {
            window.location.replace("/admin/teams");
          }, 300);
        } else {
          setErrorMsg(data.error || "Failed to synchronize user session");
          setTimeout(() => {
            window.location.replace("/login");
          }, 3000);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "An unexpected network error occurred");
        setTimeout(() => {
          window.location.replace("/login");
        }, 3000);
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      {!errorMsg ? (
        <>
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-lg font-semibold">{status}</h2>
          <p className="text-xs text-slate-400 mt-1">Please wait while we set up your workspace.</p>
        </>
      ) : (
        <div className="text-center space-y-2">
          <div className="text-red-400 text-3xl font-bold">✕</div>
          <h2 className="text-lg font-semibold text-red-200">Authentication Error</h2>
          <p className="text-sm text-slate-300 max-w-md bg-slate-800 p-3 rounded-lg border border-red-500/30">
            {errorMsg}
          </p>
          <p className="text-xs text-slate-400 mt-2">Redirecting to login page...</p>
        </div>
      )}
    </div>
  );
}
