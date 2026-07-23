import { LoginForm } from "./login-form";
import { getSetupStatus } from "@/lib/bootstrap-admin";

// Rendered per request so the admin bootstrap below runs on a real server (not at build time).
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // While the ADMIN_* secrets are set, each load of this page runs the (idempotent) admin
  // bootstrap and shows its outcome in the banner below — so first-login setup needs no
  // terminal and no log-digging. Removing the secrets removes the banner.
  const setup = await getSetupStatus();

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-900 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-brand-800 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-800">MALTAMAN</h1>
          <p className="mt-1 text-sm text-slate-500">Protokol z obhliadky nehnuteľnosti</p>
        </div>
        {setup && (
          <div
            className={`mb-4 rounded-lg border p-3 text-xs ${
              setup.result.status === "skipped"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <p className="font-semibold">Prvotné nastavenie účtu</p>
            {setup.result.status === "created" && (
              <p className="mt-1">
                Admin účet bol práve vytvorený: <span className="font-mono">{setup.adminEmail}</span>
              </p>
            )}
            {setup.result.status === "reset" && (
              <p className="mt-1">
                Heslo účtu <span className="font-mono">{setup.adminEmail}</span> bolo práve nastavené podľa
                ADMIN_PASSWORD.
              </p>
            )}
            {setup.result.status === "exists" && (
              <p className="mt-1">
                Admin účet existuje: <span className="font-mono">{setup.adminEmail}</span>. Ak heslo nefunguje,
                nastavte secret <span className="font-mono">ADMIN_FORCE_RESET=true</span> a obnovte túto stránku.
              </p>
            )}
            {setup.result.status === "skipped" && <p className="mt-1">{setup.result.message}</p>}
            {setup.passwordLength != null && setup.result.status !== "skipped" && (
              <p className="mt-1">
                Heslo v ADMIN_PASSWORD má <strong>{setup.passwordLength}</strong> znakov — skontrolujte, že zadávate
                presne toľko (pozor na medzery a automatické veľké písmená).
              </p>
            )}
            <p className="mt-1 text-[11px] opacity-80">
              Tento panel zmizne, keď po prihlásení odstránite ADMIN_* secrets.
            </p>
          </div>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
