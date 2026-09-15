"use client";
import { useState } from "react";

export function AddUserButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("AGENT");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert(`User berhasil ditambahkan!\nPassword Default: ${data.defaultPassword}`);
      setIsOpen(false);
      window.location.reload();
    } else {
      alert(`Gagal: ${data.error}`);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium text-sm hover:bg-emerald-700"
      >
        + Add User by Email
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Add New Member</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border p-2 rounded" 
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
                  className="w-full border p-2 rounded" 
                  placeholder="user@gmail.com" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">System Role</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border p-2 rounded"
                >
                  <option value="ADMIN font-medium">IT Lead / Admin</option>
                  <option value="AGENT">IT Support / Agent</option>
                  <option value="USER">User / End User</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded text-sm"
                >
                  {loading ? "Saving..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
