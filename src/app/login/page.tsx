"use client";

import { LifeBuoy, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const nextPath = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      requiresTwoFactor?: boolean;
    };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Those credentials were not recognized.");
      return;
    }
    if (payload.requiresTwoFactor) {
      setStep("otp");
      setOtp("");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  async function submitOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: otp.replaceAll(" ", ""),
        backup: useBackup,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "That verification code is not valid.");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between bg-[#0b1220] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-slate-950">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <p className="text-lg font-semibold">Nexus Service Management</p>
        </div>
        <div className="max-w-lg">
          <p className="text-sm uppercase tracking-[0.2em] text-teal-300">ITSM workspace</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Tickets, live support chat, and SLA follow-ups in one desk.
          </h1>
          <p className="mt-4 text-slate-400">
            Dual-channel conversations, one-click reminders, and an audit trail inspired by Jira Service Management, ServiceNow, and Freshservice.
          </p>
        </div>
        <p className="text-xs text-slate-500">Protected with optional authenticator 2FA.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        {step === "credentials" ? (
          <form onSubmit={submitCredentials} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-950">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
            <div className="mt-6 space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="mt-1"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="mt-1"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </div>
            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            <Button className="mt-5 w-full" disabled={loading}>
              {loading ? "Signing in…" : "Enter service desk"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitOtp} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-950">Two-factor verification</h2>
            <p className="mt-1 text-sm text-slate-500">
              {useBackup
                ? "Enter one of your 8-digit emergency backup codes."
                : "Enter the 6-digit code from Google Authenticator or Microsoft Authenticator."}
            </p>
            <div className="mt-6">
              <Label htmlFor="otp">{useBackup ? "Backup code" : "Authenticator code"}</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-1 tracking-[0.3em]"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                maxLength={useBackup ? 8 : 6}
                required
              />
            </div>
            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            <Button className="mt-5 w-full" disabled={loading}>
              {loading ? "Verifying…" : "Verify and continue"}
            </Button>
            <button
              type="button"
              className="mt-3 w-full text-sm font-medium text-teal-700 hover:underline"
              onClick={() => {
                setUseBackup((current) => !current);
                setOtp("");
                setError("");
              }}
            >
              {useBackup ? "Use authenticator app instead" : "Lost your device? Use a backup code"}
            </button>
            <button
              type="button"
              className="mt-2 w-full text-sm text-slate-500 hover:text-slate-800"
              onClick={() => {
                setStep("credentials");
                setError("");
                setOtp("");
              }}
            >
              Back to sign in
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
