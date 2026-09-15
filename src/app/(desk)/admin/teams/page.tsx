"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  twoFactorEnabled?: boolean;
}

export default function TeamsPage() {
  const [activeTab, setActiveTab] = useState<"teams" | "roles">("roles");
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // State Modal Add User
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("AGENT");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data user dari API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teams");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setUsers(data);
        else if (data.users) setUsers(data.users);
      }
    } catch (err) {
      console.error("Gagal mengambil data user:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Submit User Baru
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(
          `User berhasil ditambahkan!\n\nEmail: ${newEmail}\nPassword Default: ${
            data.defaultPassword || "Welcome123!"
          }`
        );
        setShowModal(false);
        setNewName("");
        setNewEmail("");
        setNewRole("AGENT");
        fetchUsers(); // Refresh list user
      } else {
        alert("Gagal menambahkan user: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter User berdasarkan pencarian & role
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Team & role management
          </h1>
          <p className="text-sm text-slate-500">
            Create support teams, assign members, and change system roles. Admin
            only.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
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
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1 text-sm font-medium">
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === "teams"
              ? "bg-white text-slate-900 shadow-sm"
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

      {/* Main Content Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 absolute left-3 top-3.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search name, email, or department"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All roles</option>
            <option value="ADMIN">IT Lead / Admin</option>
            <option value="AGENT">IT Support / Agent</option>
            <option value="USER">User / End User</option>
          </select>
        </div>

        {/* User Table */}
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading users data...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
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
                      <button className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
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

      {/* Pop-up Modal: Add User */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Add User by Email
              </h3>
              <button
                onClick={() => setShowModal(false)}
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
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Antoni Salim"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Gmail / Active Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  System Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="ADMIN">IT Lead / Admin</option>
                  <option value="AGENT">IT Support / Agent</option>
                  <option value="USER">User / End User</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
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
