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

export default function TeamsClient() {
  const [activeTab, setActiveTab] = useState<"teams" | "roles">("teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // Modal State - Add Team
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");

  // Modal State - Add User by Email
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("AGENT");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teams");
      if (res.ok) {
        const data = await res.json();
        if (data.teams) setTeams(data.teams);
        if (data.users) setUsers(data.users);
        else if (Array.isArray(data)) setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch teams/users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit Handler - Add User by Email
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          role: userRole,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(
          `User berhasil ditambahkan!\n\nEmail: ${userEmail}\nPassword Default: ${
            data.defaultPassword || "Welcome123!"
          }`
        );
        setShowAddUserModal(false);
        setUserName("");
        setUserEmail("");
        setUserRole("AGENT");
        fetchData();
      } else {
        alert("Gagal menambahkan user: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter User berdasarkan Search & Role
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Team & role management
          </h1>
          <p className="text-sm text-slate-500">
            Create support teams, assign members, and change system roles. Admin only.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add User by Email
          </button>

          {activeTab === "teams" && (
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
            >
              + Add team
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1 text-sm font-medium">
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === "teams"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Team management
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === "roles"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          User roles
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {activeTab === "teams" ? (
          /* TAB 1: TEAM MANAGEMENT */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-semibold uppercase border-b border-slate-100">
                  <th className="px-6 py-3.5">Team</th>
                  <th className="px-6 py-3.5">Members</th>
                  <th className="px-6 py-3.5">Assigned Tickets</th>
                  <th className="px-6 py-3.5">Open Tickets</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Loading teams...
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{team.name}</div>
                        <div className="text-xs text-slate-400">{team.description || "—"}</div>
                      </td>
                      <td className="px-6 py-4">{team.members?.length || 1}</td>
                      <td className="px-6 py-4">0</td>
                      <td className="px-6 py-4">0</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Members
                        </button>
                        <button className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Edit
                        </button>
                        <button className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 2: USER ROLES */
          <div>
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search name, email, or department"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">All roles</option>
                <option value="ADMIN">IT Lead / Admin</option>
                <option value="AGENT">IT Support / Agent</option>
                <option value="USER">User / End User</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-xs font-semibold uppercase border-b border-slate-100">
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Teams</th>
                    <th className="px-6 py-3.5">System Role</th>
                    <th className="px-6 py-3.5 text-right">Account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {user.name || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
                            IT
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              user.role === "ADMIN"
                                ? "bg-purple-100 text-purple-700"
                                : user.role === "AGENT"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {user.role === "ADMIN"
                              ? "IT LEAD / ADMIN"
                              : user.role === "AGENT"
                              ? "AGENT"
                              : "USER"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-500">
                            {user.twoFactorEnabled ? "2FA ON" : "2FA OFF"}
                          </span>
                          <button className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Add User by Email */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Add User by Email</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Gmail / Active Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  System Role
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm bg-white focus:outline-none"
                >
                  <option value="ADMIN">IT Lead / Admin</option>
                  <option value="AGENT">IT Support / Agent</option>
                  <option value="USER">User / End User</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Team */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add team</h3>
                <p className="text-xs text-slate-500">
                  Create a support team such as Network Support or L1 Helpdesk.
                </p>
              </div>
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  TEAM NAME
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="L1 Helpdesk"
                  className="w-full border border-teal-500 rounded-lg px-3.5 py-2 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  placeholder="First-line intake, password resets, and workstation support."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold"
                >
                  Create team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}