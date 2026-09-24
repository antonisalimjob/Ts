"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

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

  return (
    <div className="min-h-screen flex text-slate-800">
      {/* Left Banner */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 flex-col justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-slate-900 text-xl">
            ⊗
          </div>
          <span className="font-bold text-xl tracking-tight">Nexus Service Management</span>
        </div>
        <div className="space-y-4 max-w-lg">
          <p className="text-emerald-400 font-semibold text-sm tracking-wider uppercase">
            ITSM Workspace
          </p>
          <h1 className="text-4xl font-bold leading-tight">
            Tickets, live support chat, and SLA follow-ups in one desk.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Dual-channel conversations, one-click reminders, and an audit trail inspired by Jira Service Management, ServiceNow, and Freshservice.
          </p>
        </div>
        <div className="text-xs text-slate-500">© Nexus SM. All rights reserved.</div>
      </div>

      {/* Right Login / Sign Up Form */}
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

          {/* Switcher Login <-> Sign Up */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-600">
              {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
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
