import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !canManageUsers(user.role)) redirect("/");
  return children;
}
