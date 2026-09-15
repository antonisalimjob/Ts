"use client";
import { useState } from "react";

export default function TeamsPage() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("AGENT");
  const [loading, setLoading] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert(`User berhasil ditambahkan!\nPassword Default: ${data.defaultPassword}`);
      setShowModal(false);
      window.location.reload();
    } else {
      alert("Gagal: " + data.error);
    }
  };

  return (
    <div className="p-6">
      {/* Tombol Add User */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team & role management</h1>
          <p className="text-gray-500 text-sm">Create support teams, assign members, and change system roles. Admin only.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          + Add User by Email
        </button>
      </div>

      {/* Pop-up Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border p-2 rounded-md"
                  placeholder="Nama Lengkap"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gmail / Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border p-2 rounded-md"
                  placeholder="user@gmail.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border p-2 rounded-md"
                >
                  <option value="ADMIN">IT Lead / Admin</option>
                  <option value="AGENT">IT Support / Agent</option>
                  <option value="USER">User / End User</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm"
                >
                  {loading ? "Saving..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { TeamsAndRolesManager } from "@/components/admin/teams-and-roles";

export default function TeamsAndRolesPage() {
  return <TeamsAndRolesManager />;
}
