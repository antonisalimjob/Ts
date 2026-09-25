"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Deteksi jika browser dialihkan dari Supabase OAuth membawa hash #access_token=...
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      // Teruskan hash token ke client callback runner
      router.push(`/auth/callback/client${window.location.hash}`);
    }
  }, [router]);

  // Form Submit (Email & Password)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (isSignUp) {
          alert("Pendaftaran berhasil! Silakan login.");
          setIsSignUp(false);
        } else {
          router.push("/admin/teams");
        }
      } else {
        alert("Gagal: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Auth
  const handleGoogleAuth = () => {
    const supabaseProjectUrl = "https://hbblarnhwbvmotzjxjsh.supabase.co";
    const redirectTo = encodeURIComponent(`${window.location.origin}/auth/callback`);

    window.location.href = `${supabaseProjectUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
  };

  return (
    <div className="min-h-screen flex text-slate-800">
      {/* Banner Kiri */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 flex-col justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-slate-900 text-xl">
            ⊗
          </div>
          <span className="font-bold text-xl tracking-tight">
            Nexus Service Management
          </span>
        </div>
        <div className="space-y-4 max-w-lg">
          <p className="text-emerald-400 font-semibold text-sm tracking-wider uppercase">
            ITSM Workspace
          </p>
          <h1 className="text-4xl font-bold leading-tight">
            Tickets, live support chat, and SLA follow-ups in one desk.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Dual-channel conversations, one-click reminders, and an audit trail
            inspired by Jira Service Management, ServiceNow, and Freshservice.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          © Nexus SM. All rights reserved.
        </div>
      </div>

      {/* Form Kanan */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isSignUp ? "Create an account" : "Sign in"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isSignUp
                ? "Register a new client or agent account"
                : "Sign in to your account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition shadow-sm text-sm"
            >
              {loading
                ? "Processing..."
                : isSignUp
                ? "Sign Up"
                : "Enter service desk"}
            </button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-400 font-medium absolute">
              OR
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl shadow-sm transition text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {isSignUp ? "Sign Up with Google" : "Sign In with Google"}
          </button>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-600">
              {isSignUp
                ? "Already have an account?"
                : "Don't have an account yet?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-emerald-600 hover:underline ml-1"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
