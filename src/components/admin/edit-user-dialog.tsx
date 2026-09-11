"use client";

import { useState } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import type { Role } from "@prisma/client";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isTwoFactorEnabled?: boolean;
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return payload.error ?? "Request failed";
}

export function EditUserDialog({
  user,
  onOpenChange,
  onSaved,
}: {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit account</DialogTitle>
        <DialogDescription>
          Update this person&apos;s profile, reset their password, or clear two-factor authentication.
        </DialogDescription>
        {user ? (
          <EditUserForm key={user.id} user={user} onOpenChange={onOpenChange} onSaved={onSaved} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  onOpenChange,
  onSaved,
}: {
  user: AdminUser;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetting2fa, setResetting2fa] = useState(false);
  const twoFactorOn = Boolean(user.isTwoFactorEnabled);

  return (
        <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (newPassword && newPassword !== confirmPassword) {
              toast.error("New password and confirmation do not match.");
              return;
            }
            setBusy(true);
            const profile = await fetch("/api/users/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, name, email }),
            });
            if (!profile.ok) {
              setBusy(false);
              toast.error(await readError(profile));
              return;
            }
            if (newPassword) {
              const password = await fetch("/api/users/change-password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: user.id,
                  newPassword,
                  confirmPassword,
                }),
              });
              if (!password.ok) {
                setBusy(false);
                toast.error(await readError(password));
                return;
              }
            }
            setBusy(false);
            toast.success("Account updated");
            onOpenChange(false);
            onSaved();
          }}
        >
          <div>
            <Label htmlFor="admin-user-name">Full name</Label>
            <Input
              id="admin-user-name"
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="admin-user-email">Email address</Label>
            <Input
              id="admin-user-email"
              type="email"
              className="mt-1"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="admin-user-password">New password</Label>
              <Input
                id="admin-user-password"
                type="password"
                className="mt-1"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                placeholder="Leave blank to keep"
              />
            </div>
            <div>
              <Label htmlFor="admin-user-confirm">Confirm password</Label>
              <Input
                id="admin-user-confirm"
                type="password"
                className="mt-1"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={newPassword ? 8 : undefined}
                placeholder="Leave blank to keep"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {twoFactorOn ? (
                  <Shield className="h-4 w-4 text-emerald-700" />
                ) : (
                  <ShieldOff className="h-4 w-4 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900">Two-factor authentication</p>
                  <p className="text-xs text-slate-500">
                    {twoFactorOn
                      ? "Enabled. Reset this if they lost their authenticator."
                      : "Disabled. They can enable 2FA from Account settings."}
                  </p>
                </div>
              </div>
              <Badge tone={twoFactorOn ? "green" : "slate"}>{twoFactorOn ? "On" : "Off"}</Badge>
            </div>
            {twoFactorOn ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="mt-3"
                disabled={resetting2fa}
                onClick={async () => {
                  setResetting2fa(true);
                  const response = await fetch(`/api/admin/users/${user.id}/2fa`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "reset" }),
                  });
                  setResetting2fa(false);
                  if (!response.ok) {
                    toast.error(await readError(response));
                    return;
                  }
                  toast.success("Two-factor authentication was reset");
                  onSaved();
                }}
              >
                {resetting2fa ? "Resetting…" : "Reset 2FA"}
              </Button>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={busy}>{busy ? "Saving…" : "Save account"}</Button>
          </div>
        </form>
  );
}
