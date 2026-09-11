"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ROLE_LABEL, TEAM_ROLE_LABEL } from "@/lib/constants";
import type { Role } from "@prisma/client";

type TeamRole = "TEAM_LEAD" | "MEMBER";

interface TeamMemberView {
  membershipId: string;
  teamRole: TeamRole;
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  department: string | null;
  isActive: boolean;
}

interface TeamView {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
  assignedTicketCount: number;
  openTicketCount: number;
  members: TeamMemberView[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  title: string | null;
  isActive: boolean;
  createdAt: string;
  isTwoFactorEnabled: boolean;
  teams: { id: string; name: string; teamRole: TeamRole }[];
}

const ROLE_TONE: Record<Role, "slate" | "teal" | "violet"> = {
  END_USER: "slate",
  TECHNICIAN: "teal",
  ADMIN: "violet",
};

async function readError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return payload.error ?? "Request failed";
}

export function TeamsAndRolesManager() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"teams" | "roles">("teams");

  const teamsQuery = useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => {
      const response = await fetch("/api/admin/teams");
      if (!response.ok) throw new Error(await readError(response));
      return (await response.json()) as TeamView[];
    },
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error(await readError(response));
      return (await response.json()) as AdminUser[];
    },
  });

  const teams = teamsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Team & role management</h1>
        <p className="text-sm text-slate-500">
          Create support teams, assign members, and change system roles. Admin only.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setTab("teams")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "teams" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Team management
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "roles" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          User roles
        </button>
      </div>

      {tab === "teams" ? (
        <TeamsTab teams={teams} users={users} loading={teamsQuery.isLoading} onChanged={refresh} />
      ) : (
        <RolesTab users={users} loading={usersQuery.isLoading} onChanged={refresh} />
      )}
    </div>
  );
}

function TeamsTab({
  teams,
  users,
  loading,
  onChanged,
}: {
  teams: TeamView[];
  users: AdminUser[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeamView | null>(null);
  const [deleting, setDeleting] = useState<TeamView | null>(null);
  const [membersOf, setMembersOf] = useState<TeamView | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add team
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-2.5">Team</th>
              <th className="px-3 py-2.5">Members</th>
              <th className="px-3 py-2.5">Assigned tickets</th>
              <th className="px-3 py-2.5">Open tickets</th>
              <th className="px-5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-5 py-8 text-slate-500" colSpan={5}>
                  Loading teams…
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-slate-500" colSpan={5}>
                  No support teams yet. Create L1 Helpdesk, Network Support, or Hardware Team to get started.
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{team.name}</p>
                    <p className="text-xs text-slate-500">{team.description || "No description"}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{team.memberCount}</td>
                  <td className="px-3 py-3 text-slate-700">{team.assignedTicketCount}</td>
                  <td className="px-3 py-3 text-slate-700">{team.openTicketCount}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setMembersOf(team)}>
                        <Users className="h-3.5 w-3.5" />
                        Members
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(team)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(team)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TeamFormDialog
        open={createOpen}
        title="Add team"
        onOpenChange={setCreateOpen}
        onSaved={onChanged}
      />
      <TeamFormDialog
        open={Boolean(editing)}
        title="Edit team"
        team={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={onChanged}
      />
      <DeleteTeamDialog
        team={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={onChanged}
      />
      <MembersDialog
        team={membersOf}
        users={users}
        onOpenChange={(open) => {
          if (!open) setMembersOf(null);
        }}
        onSaved={onChanged}
      />
    </div>
  );
}

function TeamFormDialog({
  open,
  title,
  team,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  title: string;
  team?: TeamView | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {team
            ? "Update this support team’s name and description."
            : "Create a support team such as Network Support or L1 Helpdesk."}
        </DialogDescription>
        {open ? (
          <TeamFormFields
            key={team?.id ?? "new"}
            team={team}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TeamFormFields({
  team,
  onOpenChange,
  onSaved,
}: {
  team?: TeamView | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(team);

  return (
    <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            const response = await fetch(isEdit ? `/api/admin/teams/${team!.id}` : "/api/admin/teams", {
              method: isEdit ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, description }),
            });
            setBusy(false);
            if (!response.ok) {
              toast.error(await readError(response));
              return;
            }
            toast.success(isEdit ? "Team updated" : "Team created");
            onOpenChange(false);
            onSaved();
          }}
        >
          <div>
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="L1 Helpdesk"
              required
            />
          </div>
          <div>
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              className="mt-1"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="First-line intake, password resets, and workstation support."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create team"}</Button>
          </div>
    </form>
  );
}

function DeleteTeamDialog({
  team,
  onOpenChange,
  onDeleted,
}: {
  team: TeamView | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={Boolean(team)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Delete {team?.name}?</DialogTitle>
        <DialogDescription>
          Members stay in the directory. Tickets assigned to this team are unassigned from the team
          (assignees are kept). This cannot be undone.
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={busy || !team}
            onClick={async () => {
              if (!team) return;
              setBusy(true);
              const response = await fetch(`/api/admin/teams/${team.id}`, { method: "DELETE" });
              setBusy(false);
              if (!response.ok) {
                toast.error(await readError(response));
                return;
              }
              toast.success("Team removed");
              onOpenChange(false);
              onDeleted();
            }}
          >
            {busy ? "Deleting…" : "Delete team"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MembersDialog({
  team,
  users,
  onOpenChange,
  onSaved,
}: {
  team: TeamView | null;
  users: AdminUser[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={Boolean(team)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(640px,calc(100%-2rem))]">
        <DialogTitle>Manage members — {team?.name}</DialogTitle>
        <DialogDescription>
          Add or remove people from this team. Team leads appear first in the roster.
        </DialogDescription>
        {team ? (
          <MembersEditor key={team.id} team={team} users={users} onOpenChange={onOpenChange} onSaved={onSaved} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MembersEditor({
  team,
  users,
  onOpenChange,
  onSaved,
}: {
  team: TeamView;
  users: AdminUser[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, TeamRole>>(
    Object.fromEntries(team.members.map((member) => [member.id, member.teamRole])) as Record<string, TeamRole>,
  );
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (!needle) return true;
      return (
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.department?.toLowerCase().includes(needle)
      );
    });
  }, [users, query]);

  return (
    <>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search directory"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {filtered.map((user) => {
            const checked = user.id in selected;
            return (
              <label
                key={user.id}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelected((current) => {
                      const next = { ...current };
                      if (event.target.checked) next[user.id] = current[user.id] ?? "MEMBER";
                      else delete next[user.id];
                      return next;
                    });
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">{user.name}</span>
                  <span className="block text-xs text-slate-500">
                    {user.email} · {ROLE_LABEL[user.role]}
                  </span>
                </span>
                {checked ? (
                  <select
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={selected[user.id]}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [user.id]: event.target.value as TeamRole,
                      }))
                    }
                  >
                    <option value="MEMBER">{TEAM_ROLE_LABEL.MEMBER}</option>
                    <option value="TEAM_LEAD">{TEAM_ROLE_LABEL.TEAM_LEAD}</option>
                  </select>
                ) : null}
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || !team}
            onClick={async () => {
              if (!team) return;
              const currentRoles = Object.fromEntries(
                team.members.map((member) => [member.id, member.teamRole]),
              ) as Record<string, TeamRole>;
              const nextIds = new Set(Object.keys(selected));
              const add = [...nextIds]
                .filter((userId) => currentRoles[userId] !== selected[userId])
                .map((userId) => ({ userId, teamRole: selected[userId] }));
              const remove = team.members
                .map((member) => member.id)
                .filter((id) => !nextIds.has(id));
              if (add.length === 0 && remove.length === 0) {
                onOpenChange(false);
                return;
              }
              setBusy(true);
              const response = await fetch(`/api/admin/teams/${team.id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  add: add.length ? add : undefined,
                  remove: remove.length ? remove : undefined,
                }),
              });
              setBusy(false);
              if (!response.ok) {
                toast.error(await readError(response));
                return;
              }
              toast.success("Team members updated");
              onOpenChange(false);
              onSaved();
            }}
          >
            {busy ? "Saving…" : "Save members"}
          </Button>
        </div>
    </>
  );
}

function RolesTab({
  users,
  loading,
  onChanged,
}: {
  users: AdminUser[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [pending, setPending] = useState<{ user: AdminUser; role: Role } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editing = users.find((user) => user.id === editingId) ?? null;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (!needle) return true;
      return (
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.department?.toLowerCase().includes(needle)
      );
    });
  }, [users, q, roleFilter]);

  const adminCount = users.filter((user) => user.role === "ADMIN" && user.isActive).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search name, email, or department"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as "" | Role)}
        >
          <option value="">All roles</option>
          <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
          <option value="TECHNICIAN">{ROLE_LABEL.TECHNICIAN}</option>
          <option value="END_USER">{ROLE_LABEL.END_USER}</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-2.5">Name</th>
              <th className="px-3 py-2.5">Email</th>
              <th className="px-3 py-2.5">Teams</th>
              <th className="px-3 py-2.5">Department</th>
              <th className="px-5 py-2.5">System role</th>
              <th className="px-5 py-2.5 text-right">Account</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-5 py-8 text-slate-500" colSpan={6}>
                  Loading directory…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-slate-500" colSpan={6}>
                  No users match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.title || "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{user.email}</td>
                  <td className="px-3 py-3">
                    {user.teams.length ? (
                      <div className="flex flex-wrap gap-1">
                        {user.teams.map((team) => (
                          <Badge key={team.id} tone="blue">
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{user.department || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
                      <select
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                        value={user.role}
                        onChange={(event) => {
                          const role = event.target.value as Role;
                          if (role === user.role) return;
                          setPending({ user, role });
                        }}
                      >
                        <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
                        <option value="TECHNICIAN">{ROLE_LABEL.TECHNICIAN}</option>
                        <option value="END_USER">{ROLE_LABEL.END_USER}</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Badge tone={user.isTwoFactorEnabled ? "green" : "slate"}>
                        {user.isTwoFactorEnabled ? "2FA on" : "2FA off"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(user.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditUserDialog
        user={editing}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        onSaved={onChanged}
      />

      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogTitle>Change role?</DialogTitle>
          <DialogDescription>
            {pending
              ? `Change ${pending.user.name} from ${ROLE_LABEL[pending.user.role]} to ${ROLE_LABEL[pending.role]}? They will pick up the new permissions on their next request.`
              : null}
            {pending?.user.role === "ADMIN" && pending.role !== "ADMIN" && adminCount <= 1
              ? " This is the last administrator and cannot be demoted."
              : null}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !pending ||
                (pending.user.role === "ADMIN" && pending.role !== "ADMIN" && adminCount <= 1)
              }
              onClick={async () => {
                if (!pending) return;
                setBusy(true);
                const response = await fetch(`/api/admin/users/${pending.user.id}/role`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ role: pending.role }),
                });
                setBusy(false);
                if (!response.ok) {
                  toast.error(await readError(response));
                  return;
                }
                toast.success("Role updated");
                setPending(null);
                onChanged();
              }}
            >
              {busy ? "Updating…" : "Confirm change"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
