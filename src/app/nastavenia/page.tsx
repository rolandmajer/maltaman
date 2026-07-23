import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await auth();
  return (
    <>
      <AppHeader userName={session!.user.name ?? ""} backHref="/" />
      <SettingsClient />
    </>
  );
}
