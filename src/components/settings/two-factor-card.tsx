"use client";

import { Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface Status {
  enabled: boolean;
  remainingBackupCodes: number;
}

interface SetupPayload {
  qrDataUrl: string;
  secret: string;
  issuer: string;
}

export function TwoFactorCard() {
  const status = useQuery({
    queryKey: ["2fa-status"],
    queryFn: async () => {
      const response = await fetch("/api/auth/2fa/status");
      if (!response.ok) throw new Error("Could not load 2FA status");
      return (await response.json()) as Status;
    },
  });

  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    const response = await fetch("/api/auth/2fa/setup", { method: "POST" });
    setBusy(false);
    if (!response.ok) {
      toast.error("Could not start authenticator setup");
      return;
    }
    setBackupCodes(null);
    setSetup((await response.json()) as SetupPayload);
    setCode("");
  }

  async function confirmSetup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/auth/2fa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error("That verification code is not valid");
      return;
    }
    const payload = (await response.json()) as { backupCodes: string[] };
    setSetup(null);
    setBackupCodes(payload.backupCodes);
    toast.success("Two-factor authentication is on");
    await status.refetch();
  }

  async function disable(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: disableCode }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error("Could not disable 2FA");
      return;
    }
    setDisableCode("");
    setBackupCodes(null);
    toast.success("Two-factor authentication is off");
    await status.refetch();
  }

  const enabled = status.data?.enabled ?? false;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {enabled ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Two-factor authentication</h2>
          <p className="mt-1 text-sm text-slate-500">
            {enabled
              ? `Enabled. ${status.data?.remainingBackupCodes ?? 0} unused backup codes remaining.`
              : "Disabled. Sign-in currently uses email and password only."}
          </p>
        </div>
      </div>

      {!enabled && !setup ? (
        <Button className="mt-4" disabled={busy} onClick={() => void startSetup()}>
          Enable two-factor authentication
        </Button>
      ) : null}

      {setup ? (
        <form onSubmit={confirmSetup} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-600">
            Scan this QR code in Google Authenticator or Microsoft Authenticator, then enter the 6-digit code to
            confirm.
          </p>
          {/* QR codes are data URLs from the authenticator setup API. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setup.qrDataUrl}
            alt="Authenticator QR code"
            className="h-52 w-52 rounded-lg border border-slate-200 bg-white p-2"
          />
          <p className="text-xs text-slate-500">
            Can&apos;t scan? Enter this secret manually:{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">{setup.secret}</code>
          </p>
          <div>
            <Label htmlFor="setup-code">Verification code</Label>
            <Input
              id="setup-code"
              className="mt-1 max-w-xs tracking-[0.3em]"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button disabled={busy}>{busy ? "Confirming…" : "Confirm and enable"}</Button>
            <Button type="button" variant="outline" onClick={() => setSetup(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {backupCodes ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-950">Emergency backup codes</h3>
          <p className="mt-1 text-xs text-amber-800">
            Store these 8-digit codes somewhere safe. Each code can be used once if you lose your authenticator.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-slate-900">
            {backupCodes.map((item) => (
              <li key={item} className="rounded bg-white px-2 py-1.5 text-center tracking-widest">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {enabled ? (
        <form onSubmit={disable} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-600">Enter a current authenticator code to turn 2FA off.</p>
          <div>
            <Label htmlFor="disable-code">Authenticator code</Label>
            <Input
              id="disable-code"
              className="mt-1 max-w-xs tracking-[0.3em]"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(event) => setDisableCode(event.target.value)}
              required
            />
          </div>
          <Button variant="danger" disabled={busy}>
            <ShieldOff />
            Disable 2FA
          </Button>
        </form>
      ) : null}
    </section>
  );
}
