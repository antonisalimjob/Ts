"use client";

import { useState, useEffect } from "react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminTeamsPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("END_USER");
  const [saving, setSaving] = useState(false);

  // Fetch identitas user aktif
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user || data);
      }
    } catch (e) {
      console.warn("Gagal mengambil profil user aktif");
    }
  };

  // Fetch daftar user
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();

      if (res.ok) {
        if (Array.isArray(data)) setUsers(data);
        else if (Array.isArray(data.users)) setUsers(data.users);
        else if (Array.isArray(data.data)) setUsers(data.data);
        else setUsers([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data user:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  const handleEditClick = (user: UserItem) => {
    setEditingUser(user);
    setEditName(user.name || "");
    let initialRole = user.role;
    if (initialRole === "CLIENT" || initialRole === "USER") initialRole = "END_USER";
    if (initialRole === "AGENT") initialRole = "TECHNICIAN";
    setEditRole(initialRole || "END_USER");
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    // Proteksi UI: Cegah Admin mengubah role dirinya sendiri menjadi non-ADMIN
    if (currentUser?.id === editingUser.id && editRole !== "ADMIN") {
      alert("Anda tidak dapat mencabut hak akses Admin dari akun Anda sendiri.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });

      if (!res.ok) {
        await fetch(`/api/admin/users`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingUser.id, name: editName, role: editRole }),
        });
      }

      alert("User berhasil diperbarui!");
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      alert("Gagal memperbarui user: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    // Proteksi UI: Cegah Admin menghapus akunnya sendiri
    if (currentUser?.id === user.id || currentUser?.email === user.email) {
      alert("Anda tidak dapat menghapus akun Admin yang sedang aktif digunakan.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus user ${user.email}?`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
      if (res.ok) {
        alert("User berhasil dihapus!");
        fetchUsers();
      } else {
        const data = await res.json();
        alert("Gagal: " + (data.error || "Gagal menghapus user"));
      }
    } catch (err: any) {
      alert("Gagal menghapus user: " + err.message);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 text-slate-800">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Team & role management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create support teams, assign members, and change system roles. Admin only.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <input
          type="text"
          placeholder="Search name, email, or department"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading team members...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Tidak ada user ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">NAME</th>
                  <th className="py-3 px-4">EMAIL</th>
                  <th className="py-3 px-4">SYSTEM ROLE</th>
                  <th className="py-3 px-4 text-right">ACCOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id || currentUser?.email === u.email;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {u.name || "-"} {isSelf && <span className="text-xs font-normal text-slate-400">(You)</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            u.role === "ADMIN"
                              ? "bg-purple-100 text-purple-700"
                              : u.role === "TECHNICIAN"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={isSelf}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            isSelf
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-rose-600 hover:bg-rose-700 text-white"
                          }`}
                          title={isSelf ? "Cannot delete active session account" : ""}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Edit User: {editingUser.email}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">FULL NAME</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SYSTEM ROLE</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ADMIN">IT Lead / Admin (ADMIN)</option>
                  <option value="TECHNICIAN">IT Support / Agent (TECHNICIAN)</option>
                  <option value="END_USER">User / Client (END_USER)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
