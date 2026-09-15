<button
  onClick={() => {
    const email = prompt("Masukkan Email Gmail User Baru:");
    if (!email) return;
    const name = prompt("Masukkan Nama Lengkap User:");
    const role = prompt("Masukkan Role (ADMIN / AGENT / USER):", "AGENT");

    fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(`User ${email} berhasil dibuat!\nPassword Default: Welcome123!`);
          window.location.reload();
        } else {
          alert("Gagal: " + (data.error || "Terjadi kesalahan"));
        }
      });
  }}
  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium mr-2"
>
  + Add User by Email
</button>
