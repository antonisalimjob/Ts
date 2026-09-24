"use client";

import { useState, useEffect } from "react";

interface Team {
  id: string;
  name: string;
  description?: string;
  members?: any[];
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  twoFactorEnabled?: boolean;
}

export default function TeamsAndRoles() {
  const [activeTab, setActiveTab] = useState<"teams" | "roles">("roles");
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modal State - Add User
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("AGENT");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State - Edit User
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("AGENT");
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/teams");
      if (res.ok) {
        const data = await res.json();
        if (data.teams) setTeams(data.teams);
        if (data.users) setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, email: userEmail, role: userRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`User berhasil dibuat!\nPassword Default: ${data.defaultPassword || "Welcome123!"}`);
        setShowAddUserModal(false);
        setUserName("");
        setUserEmail("");
        fetchData();
      } else {
        alert("Gagal: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditing(true);

    try {
      const res = await fetch("/api/admin/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editName,
          role: editRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Data user berhasil diperbarui!");
        setEditingUser(null);
        fetchData();
      } else {
        alert("Gagal update user: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus user: ${user.email}?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/admin/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`User ${user.email} berhasil dihapus.`);
        fetchData();
      } else {
        alert("Gagal menghapus user: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team & role management</h1>
          <p className="text-sm text-slate-500">
            Create support teams, assign members, and change system roles. Admin only.
          </p>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition"
        >
          + Add User by Email
        </button>
      </div>

      <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1 text-sm font-medium">
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === "teams" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          Team management
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === "roles" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          User roles
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {activeTab === "teams" ? (
          <div className="p-6 text-center text-slate-500 text-sm">Team management view</div>
        ) : (
          <div>
            <div className="p-4 border-b border-slate-200 flex gap-3">
              <input
                type="text"
                placeholder="Search name, email, or department"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border rounded-lg text-sm"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="ALL">All roles</option>
                <option value="ADMIN">IT Lead / Admin</option>
                <option value="AGENT">IT Support / Agent</option>
                <option value="USER">User / End User</option>
              </select>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase border-b">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Teams</th>
                  <th className="px-6 py-3.5">System Role</th>
                  <th className="px-6 py-3.5 text-right">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{user.name || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-xs bg-cyan-50 text-cyan-700 rounded border">IT</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setEditName(user.name || "");
                          setEditRole(user.role || "AGENT");
                        }}
                        className="px-3 py-1 border rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Edit User: {editingUser.email}</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">System Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm bg-white"
                >
                  <option value="ADMIN">IT Lead / Admin</option>
                  <option value="AGENT">IT Support / Agent</option>
                  <option value="USER">User / End User</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                >
                  {isEditing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add User by Email */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Add User by Email</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Gmail / Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">System Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm bg-white"
                >
                  <option value="ADMIN">IT Lead / Admin</option>
                  <option value="AGENT">IT Support / Agent</option>
                  <option value="USER">User / End User</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold"
                >
                  {isSubmitting ? "Adding..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
