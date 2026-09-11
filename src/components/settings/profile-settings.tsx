"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { TwoFactorCard } from "@/components/settings/two-factor-card";
import type { SessionUser } from "@/lib/auth";

async function readError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return payload.error ?? "Request failed";
}

export function ProfileSettings({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileBusy, setProfileBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Account settings</h1>
        <p className="text-sm text-slate-500">Manage your profile, password, and two-factor authentication.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Your display name and sign-in email.</p>
          </div>
        </div>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setProfileBusy(true);
            const response = await fetch("/api/users/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email }),
            });
            setProfileBusy(false);
            if (!response.ok) {
              toast.error(await readError(response));
              return;
            }
            toast.success("Profile updated");
            router.refresh();
          }}
        >
          <div>
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              className="mt-1"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <Button disabled={profileBusy}>{profileBusy ? "Saving…" : "Save profile"}</Button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Password</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your current password, then choose a new password of at least 8 characters.
            </p>
          </div>
        </div>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (newPassword !== confirmPassword) {
              toast.error("New password and confirmation do not match.");
              return;
            }
            setPasswordBusy(true);
            const response = await fetch("/api/users/change-password", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
            });
            setPasswordBusy(false);
            if (!response.ok) {
              toast.error(await readError(response));
              return;
            }
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            toast.success("Password updated");
          }}
        >
          <div>
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className="mt-1"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="mt-1"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="mt-1"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button disabled={passwordBusy}>{passwordBusy ? "Updating…" : "Update password"}</Button>
        </form>
      </section>

      <TwoFactorCard />
    </div>
  );
}
