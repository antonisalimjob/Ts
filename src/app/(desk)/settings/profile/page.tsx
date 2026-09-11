import { getSession } from "@/lib/auth";
import { ProfileSettings } from "@/components/settings/profile-settings";

export default async function ProfilePage() {
  const user = await getSession();
  if (!user) return null;
  return <ProfileSettings user={user} />;
}
