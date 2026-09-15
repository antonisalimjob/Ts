import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export default async function RegisterAdminPage() {
  let status = "";
  let success = false;

  try {
    const passwordHash = await bcrypt.hash("Demo123!", 10);

    await prisma.user.deleteMany({
      where: { email: "antoni.salim.job@gmail.com" },
    });

    await prisma.user.create({
      data: {
        email: "antoni.salim.job@gmail.com",
        name: "Antoni Salim",
        passwordHash: passwordHash,
        role: "ADMIN",
      },
    });

    status = "User antoni.salim.job@gmail.com berhasil dibuat dengan password: Demo123!";
    success = true;
  } catch (error: any) {
    status = "Gagal membuat user: " + error.message;
  }

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h2>Proses Pendaftaran Admin Native</h2>
      <p style={{ color: success ? "green" : "red", fontWeight: "bold" }}>
        {status}
      </p>
      {success && (
        <a href="/login" style={{ display: "inline-block", marginTop: "20px" }}>
          Klik di sini untuk Login
        </a>
      )}
    </div>
  );
}
